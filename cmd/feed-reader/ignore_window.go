package main

import (
	"encoding/json"
	"fmt"
	"slices"
	"strconv"
	"strings"
	"time"

	"github.com/nakatanakatana/feed-reader/store"
)

// ParseDaysOfWeek parses a JSON string representing days of the week [0..6] (0=Sunday, 6=Saturday).
func ParseDaysOfWeek(raw string) ([]int, error) {
	trimmed := strings.TrimSpace(raw)
	if trimmed == "" || trimmed == "[]" {
		return []int{}, nil
	}

	var days []int
	if err := json.Unmarshal([]byte(trimmed), &days); err != nil {
		return nil, fmt.Errorf("failed to parse days of week JSON %q: %w", raw, err)
	}

	for _, d := range days {
		if d < 0 || d > 6 {
			return nil, fmt.Errorf("day of week %d out of range [0, 6]", d)
		}
	}

	return days, nil
}

// parseTimeOfDay parses a time string in "HH:MM" format (supports "24:00").
func parseTimeOfDay(s string) (hour int, min int, is24 bool, err error) {
	trimmed := strings.TrimSpace(s)
	if trimmed == "24:00" {
		return 24, 0, true, nil
	}

	parts := strings.Split(trimmed, ":")
	if len(parts) != 2 {
		return 0, 0, false, fmt.Errorf("invalid time format %q, expected HH:MM", s)
	}

	h, err := strconv.Atoi(parts[0])
	if err != nil {
		return 0, 0, false, fmt.Errorf("invalid hour %q: %w", parts[0], err)
	}

	m, err := strconv.Atoi(parts[1])
	if err != nil {
		return 0, 0, false, fmt.Errorf("invalid minute %q: %w", parts[1], err)
	}

	if h == 24 && m == 0 {
		return 24, 0, true, nil
	}

	if h < 0 || h > 23 || m < 0 || m > 59 {
		return 0, 0, false, fmt.Errorf("time out of range: %02d:%02d", h, m)
	}

	return h, m, false, nil
}

// IsTimeInIgnoreWindow determines whether time t falls within an active ignore window.
// If active, returns true and the time when this window period ends.
// If inactive, returns false and zero time.
func IsTimeInIgnoreWindow(t time.Time, w store.IgnoreWindow) (bool, time.Time) {
	loc := time.UTC
	if w.Timezone != "" {
		if l, err := time.LoadLocation(w.Timezone); err == nil {
			loc = l
		}
	}

	tLoc := t.In(loc)

	days, err := ParseDaysOfWeek(w.DaysOfWeek)
	if err != nil || len(days) == 0 {
		return false, time.Time{}
	}

	startH, startM, isStart24, err := parseTimeOfDay(w.StartTime)
	if err != nil {
		return false, time.Time{}
	}

	endH, endM, isEnd24, err := parseTimeOfDay(w.EndTime)
	if err != nil {
		return false, time.Time{}
	}

	if isStart24 {
		startH = 0
		startM = 0
	}

	startMinutes := startH*60 + startM
	endMinutes := endH*60 + endM

	// All-day window: (00:00 to 24:00 or 00:00 to 00:00)
	if (startMinutes == 0 && endMinutes == 0) || (startMinutes == 0 && (isEnd24 || endMinutes == 1440)) {
		if slices.Contains(days, int(tLoc.Weekday())) {
			nextAvail := time.Date(tLoc.Year(), tLoc.Month(), tLoc.Day()+1, 0, 0, 0, 0, loc)
			return true, nextAvail
		}
		return false, time.Time{}
	}

	// Intraday window (start < end)
	if startMinutes < endMinutes {
		if !slices.Contains(days, int(tLoc.Weekday())) {
			return false, time.Time{}
		}

		startTimeToday := time.Date(tLoc.Year(), tLoc.Month(), tLoc.Day(), startH, startM, 0, 0, loc)
		var endTimeToday time.Time
		if isEnd24 || endH == 24 {
			endTimeToday = time.Date(tLoc.Year(), tLoc.Month(), tLoc.Day()+1, 0, 0, 0, 0, loc)
		} else {
			endTimeToday = time.Date(tLoc.Year(), tLoc.Month(), tLoc.Day(), endH, endM, 0, 0, loc)
		}

		if !tLoc.Before(startTimeToday) && tLoc.Before(endTimeToday) {
			return true, endTimeToday
		}
		return false, time.Time{}
	}

	// Overnight window (start > end)
	if startMinutes > endMinutes {
		// Case 1: Evening part of day D (tLoc >= start_time)
		if slices.Contains(days, int(tLoc.Weekday())) {
			startTimeToday := time.Date(tLoc.Year(), tLoc.Month(), tLoc.Day(), startH, startM, 0, 0, loc)
			if !tLoc.Before(startTimeToday) {
				nextAvail := time.Date(tLoc.Year(), tLoc.Month(), tLoc.Day()+1, endH, endM, 0, 0, loc)
				return true, nextAvail
			}
		}

		// Case 2: Morning part of day D (tLoc < end_time, where day D-1 was an active day)
		yesterdayWeekday := (int(tLoc.Weekday()) + 6) % 7
		if slices.Contains(days, yesterdayWeekday) {
			endTimeToday := time.Date(tLoc.Year(), tLoc.Month(), tLoc.Day(), endH, endM, 0, 0, loc)
			if tLoc.Before(endTimeToday) {
				return true, endTimeToday
			}
		}

		return false, time.Time{}
	}

	return false, time.Time{}
}

// AdjustNextFetchForIgnoreWindows adjusts next fetch time so that it does not fall
// within any active ignore window. If t is within an active window, it is repeatedly
// advanced to the expiration of the active window(s) until it falls outside all windows.
func AdjustNextFetchForIgnoreWindows(t time.Time, windows []store.IgnoreWindow) time.Time {
	if len(windows) == 0 {
		return t
	}

	current := t
	const maxIterations = 500

	for i := 0; i < maxIterations; i++ {
		var advanced bool
		var furthestNext time.Time

		for _, w := range windows {
			inWindow, nextTime := IsTimeInIgnoreWindow(current, w)
			if inWindow {
				if !advanced || nextTime.After(furthestNext) {
					furthestNext = nextTime
					advanced = true
				}
			}
		}

		if !advanced {
			break
		}

		if !furthestNext.After(current) {
			break
		}

		current = furthestNext
	}

	return current.In(t.Location())
}
