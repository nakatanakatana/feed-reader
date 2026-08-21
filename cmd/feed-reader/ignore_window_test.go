package main

import (
	"testing"
	"time"

	"github.com/nakatanakatana/feed-reader/store"
	"gotest.tools/v3/assert"
)

func TestIgnoreWindow_ParseDaysOfWeek(t *testing.T) {
	t.Run("valid weekday arrays", func(t *testing.T) {
		days, err := ParseDaysOfWeek("[1,2,3,4,5]")
		assert.NilError(t, err)
		assert.DeepEqual(t, days, []int{1, 2, 3, 4, 5})

		days, err = ParseDaysOfWeek("[0,6]")
		assert.NilError(t, err)
		assert.DeepEqual(t, days, []int{0, 6})

		days, err = ParseDaysOfWeek("[0,1,2,3,4,5,6]")
		assert.NilError(t, err)
		assert.DeepEqual(t, days, []int{0, 1, 2, 3, 4, 5, 6})
	})

	t.Run("empty arrays or empty string", func(t *testing.T) {
		days, err := ParseDaysOfWeek("[]")
		assert.NilError(t, err)
		assert.Equal(t, len(days), 0)

		days, err = ParseDaysOfWeek("")
		assert.NilError(t, err)
		assert.Equal(t, len(days), 0)
	})

	t.Run("with whitespace", func(t *testing.T) {
		days, err := ParseDaysOfWeek(" [ 1 , 2 , 3 ] ")
		assert.NilError(t, err)
		assert.DeepEqual(t, days, []int{1, 2, 3})
	})

	t.Run("invalid JSON", func(t *testing.T) {
		_, err := ParseDaysOfWeek("not-a-json")
		assert.Assert(t, err != nil)

		_, err = ParseDaysOfWeek("{1,2,3}")
		assert.Assert(t, err != nil)
	})

	t.Run("day out of range", func(t *testing.T) {
		_, err := ParseDaysOfWeek("[-1]")
		assert.Assert(t, err != nil)

		_, err = ParseDaysOfWeek("[7]")
		assert.Assert(t, err != nil)

		_, err = ParseDaysOfWeek("[1, 2, 8]")
		assert.Assert(t, err != nil)
	})
}

func TestIgnoreWindow_Intraday(t *testing.T) {
	jst, err := time.LoadLocation("Asia/Tokyo")
	assert.NilError(t, err)

	ny, err := time.LoadLocation("America/New_York")
	assert.NilError(t, err)

	t.Run("Mon-Fri 09:00 to 17:00 in JST", func(t *testing.T) {
		w := store.IgnoreWindow{
			ID:         "w1",
			Name:       "Business Hours JST",
			StartTime:  "09:00",
			EndTime:    "17:00",
			DaysOfWeek: "[1,2,3,4,5]",
			Timezone:   "Asia/Tokyo",
		}

		// 2026-08-19 is Wednesday
		wedMidday := time.Date(2026, 8, 19, 12, 0, 0, 0, jst)
		active, nextAvail := IsTimeInIgnoreWindow(wedMidday, w)
		assert.Assert(t, active)
		expectedEnd := time.Date(2026, 8, 19, 17, 0, 0, 0, jst)
		assert.Assert(t, nextAvail.Equal(expectedEnd))

		// Wednesday 09:00 (exact start boundary)
		wedStart := time.Date(2026, 8, 19, 9, 0, 0, 0, jst)
		active, nextAvail = IsTimeInIgnoreWindow(wedStart, w)
		assert.Assert(t, active)
		assert.Assert(t, nextAvail.Equal(expectedEnd))

		// Wednesday 16:59 (just before end boundary)
		wedBeforeEnd := time.Date(2026, 8, 19, 16, 59, 59, 0, jst)
		active, nextAvail = IsTimeInIgnoreWindow(wedBeforeEnd, w)
		assert.Assert(t, active)
		assert.Assert(t, nextAvail.Equal(expectedEnd))

		// Wednesday 17:00 (exact end boundary - exclusive)
		wedEnd := time.Date(2026, 8, 19, 17, 0, 0, 0, jst)
		active, _ = IsTimeInIgnoreWindow(wedEnd, w)
		assert.Assert(t, !active)

		// Wednesday 08:59 (before start)
		wedEarly := time.Date(2026, 8, 19, 8, 59, 59, 0, jst)
		active, _ = IsTimeInIgnoreWindow(wedEarly, w)
		assert.Assert(t, !active)

		// Wednesday 18:00 (after end)
		wedLate := time.Date(2026, 8, 19, 18, 0, 0, 0, jst)
		active, _ = IsTimeInIgnoreWindow(wedLate, w)
		assert.Assert(t, !active)

		// 2026-08-16 is Sunday (not in days_of_week)
		sunMidday := time.Date(2026, 8, 16, 12, 0, 0, 0, jst)
		active, _ = IsTimeInIgnoreWindow(sunMidday, w)
		assert.Assert(t, !active)
	})

	t.Run("Mon-Fri 09:00 to 17:00 in UTC", func(t *testing.T) {
		w := store.IgnoreWindow{
			ID:         "w-utc",
			Name:       "Business Hours UTC",
			StartTime:  "09:00",
			EndTime:    "17:00",
			DaysOfWeek: "[1,2,3,4,5]",
			Timezone:   "UTC",
		}

		// 2026-08-19 (Wed) 10:00 UTC
		wedUTC := time.Date(2026, 8, 19, 10, 0, 0, 0, time.UTC)
		active, nextAvail := IsTimeInIgnoreWindow(wedUTC, w)
		assert.Assert(t, active)
		expected := time.Date(2026, 8, 19, 17, 0, 0, 0, time.UTC)
		assert.Assert(t, nextAvail.Equal(expected))
	})

	t.Run("Mon-Fri 09:00 to 17:00 in America/New_York", func(t *testing.T) {
		w := store.IgnoreWindow{
			ID:         "w-ny",
			Name:       "Business Hours NY",
			StartTime:  "09:00",
			EndTime:    "17:00",
			DaysOfWeek: "[1,2,3,4,5]",
			Timezone:   "America/New_York",
		}

		// 2026-08-19 (Wed) 12:00 EDT (which is 16:00 UTC)
		wedEDT := time.Date(2026, 8, 19, 12, 0, 0, 0, ny)
		active, nextAvail := IsTimeInIgnoreWindow(wedEDT.UTC(), w)
		assert.Assert(t, active)
		expected := time.Date(2026, 8, 19, 17, 0, 0, 0, ny)
		assert.Assert(t, nextAvail.Equal(expected))
	})
}

func TestIgnoreWindow_Overnight(t *testing.T) {
	jst, err := time.LoadLocation("Asia/Tokyo")
	assert.NilError(t, err)

	w := store.IgnoreWindow{
		ID:         "w-night",
		Name:       "Nightly Blackout Mon-Fri JST",
		StartTime:  "23:00",
		EndTime:    "07:00",
		DaysOfWeek: "[1,2,3,4,5]", // Mon, Tue, Wed, Thu, Fri
		Timezone:   "Asia/Tokyo",
	}

	// 2026-08-17 is Monday
	// Monday 23:30 (evening part of Monday active day) -> active, window ends Tuesday 07:00
	t.Run("Monday 23:30 active evening part", func(t *testing.T) {
		monEvening := time.Date(2026, 8, 17, 23, 30, 0, 0, jst)
		active, nextAvail := IsTimeInIgnoreWindow(monEvening, w)
		assert.Assert(t, active)
		expected := time.Date(2026, 8, 18, 7, 0, 0, 0, jst) // Tuesday 07:00
		assert.Assert(t, nextAvail.Equal(expected))
	})

	// Monday 23:00 (exact start boundary)
	t.Run("Monday 23:00 exact start boundary", func(t *testing.T) {
		monStart := time.Date(2026, 8, 17, 23, 0, 0, 0, jst)
		active, nextAvail := IsTimeInIgnoreWindow(monStart, w)
		assert.Assert(t, active)
		expected := time.Date(2026, 8, 18, 7, 0, 0, 0, jst)
		assert.Assert(t, nextAvail.Equal(expected))
	})

	// 2026-08-18 is Tuesday
	// Tuesday 05:00 (morning part of Monday active day) -> active, window ends Tuesday 07:00
	t.Run("Tuesday 05:00 active morning part from Monday night", func(t *testing.T) {
		tueMorning := time.Date(2026, 8, 18, 5, 0, 0, 0, jst)
		active, nextAvail := IsTimeInIgnoreWindow(tueMorning, w)
		assert.Assert(t, active)
		expected := time.Date(2026, 8, 18, 7, 0, 0, 0, jst)
		assert.Assert(t, nextAvail.Equal(expected))
	})

	// Tuesday 06:59:59 (morning part before end boundary)
	t.Run("Tuesday 06:59:59 before end boundary", func(t *testing.T) {
		tueBeforeEnd := time.Date(2026, 8, 18, 6, 59, 59, 0, jst)
		active, nextAvail := IsTimeInIgnoreWindow(tueBeforeEnd, w)
		assert.Assert(t, active)
		expected := time.Date(2026, 8, 18, 7, 0, 0, 0, jst)
		assert.Assert(t, nextAvail.Equal(expected))
	})

	// Tuesday 07:00 (exact end boundary - exclusive)
	t.Run("Tuesday 07:00 exact end boundary", func(t *testing.T) {
		tueEnd := time.Date(2026, 8, 18, 7, 0, 0, 0, jst)
		active, _ := IsTimeInIgnoreWindow(tueEnd, w)
		assert.Assert(t, !active)
	})

	// Monday 05:00 (Sunday night was not an active day) -> NOT active
	t.Run("Monday 05:00 Sunday night was not active", func(t *testing.T) {
		monMorning := time.Date(2026, 8, 17, 5, 0, 0, 0, jst)
		active, _ := IsTimeInIgnoreWindow(monMorning, w)
		assert.Assert(t, !active)
	})

	// 2026-08-21 is Friday, 2026-08-22 is Saturday
	// Friday 23:30 (Friday evening) -> active, window ends Saturday 07:00
	t.Run("Friday 23:30 active evening part", func(t *testing.T) {
		friEvening := time.Date(2026, 8, 21, 23, 30, 0, 0, jst)
		active, nextAvail := IsTimeInIgnoreWindow(friEvening, w)
		assert.Assert(t, active)
		expected := time.Date(2026, 8, 22, 7, 0, 0, 0, jst) // Saturday 07:00
		assert.Assert(t, nextAvail.Equal(expected))
	})

	// Saturday 05:00 (morning part of Friday active day) -> active, window ends Saturday 07:00
	t.Run("Saturday 05:00 active morning part from Friday night", func(t *testing.T) {
		satMorning := time.Date(2026, 8, 22, 5, 0, 0, 0, jst)
		active, nextAvail := IsTimeInIgnoreWindow(satMorning, w)
		assert.Assert(t, active)
		expected := time.Date(2026, 8, 22, 7, 0, 0, 0, jst)
		assert.Assert(t, nextAvail.Equal(expected))
	})

	// Saturday 23:30 (Saturday evening - Saturday is not in active days) -> NOT active
	t.Run("Saturday 23:30 Saturday evening not active", func(t *testing.T) {
		satEvening := time.Date(2026, 8, 22, 23, 30, 0, 0, jst)
		active, _ := IsTimeInIgnoreWindow(satEvening, w)
		assert.Assert(t, !active)
	})

	// Sunday 05:00 (Sunday morning - Saturday night was not active) -> NOT active
	t.Run("Sunday 05:00 Sunday morning not active", func(t *testing.T) {
		sunMorning := time.Date(2026, 8, 23, 5, 0, 0, 0, jst)
		active, _ := IsTimeInIgnoreWindow(sunMorning, w)
		assert.Assert(t, !active)
	})

	// Sunday 23:30 (Sunday evening - Sunday is not in active days) -> NOT active
	t.Run("Sunday 23:30 Sunday evening not active", func(t *testing.T) {
		sunEvening := time.Date(2026, 8, 23, 23, 30, 0, 0, jst)
		active, _ := IsTimeInIgnoreWindow(sunEvening, w)
		assert.Assert(t, !active)
	})
}

func TestIgnoreWindow_AllDay(t *testing.T) {
	t.Run("00:00 to 24:00 on Weekends (Sat, Sun)", func(t *testing.T) {
		w := store.IgnoreWindow{
			ID:         "w-weekend",
			Name:       "Weekend Blackout",
			StartTime:  "00:00",
			EndTime:    "24:00",
			DaysOfWeek: "[0,6]",
			Timezone:   "UTC",
		}

		// 2026-08-22 is Saturday
		satMorning := time.Date(2026, 8, 22, 10, 0, 0, 0, time.UTC)
		active, nextAvail := IsTimeInIgnoreWindow(satMorning, w)
		assert.Assert(t, active)
		expected := time.Date(2026, 8, 23, 0, 0, 0, 0, time.UTC)
		assert.Assert(t, nextAvail.Equal(expected))

		// Saturday 00:00:00 (start of day)
		satStart := time.Date(2026, 8, 22, 0, 0, 0, 0, time.UTC)
		active, nextAvail = IsTimeInIgnoreWindow(satStart, w)
		assert.Assert(t, active)
		assert.Assert(t, nextAvail.Equal(expected))

		// 2026-08-23 is Sunday
		sunNight := time.Date(2026, 8, 23, 23, 59, 0, 0, time.UTC)
		active, nextAvail = IsTimeInIgnoreWindow(sunNight, w)
		assert.Assert(t, active)
		expectedMon := time.Date(2026, 8, 24, 0, 0, 0, 0, time.UTC)
		assert.Assert(t, nextAvail.Equal(expectedMon))

		// 2026-08-24 is Monday (inactive)
		mon := time.Date(2026, 8, 24, 0, 0, 0, 0, time.UTC)
		active, _ = IsTimeInIgnoreWindow(mon, w)
		assert.Assert(t, !active)

		// 2026-08-21 is Friday (inactive)
		fri := time.Date(2026, 8, 21, 23, 59, 59, 0, time.UTC)
		active, _ = IsTimeInIgnoreWindow(fri, w)
		assert.Assert(t, !active)
	})

	t.Run("00:00 to 00:00 on Sunday in JST", func(t *testing.T) {
		jst, err := time.LoadLocation("Asia/Tokyo")
		assert.NilError(t, err)

		w := store.IgnoreWindow{
			ID:         "w-sun",
			Name:       "Sunday Blackout",
			StartTime:  "00:00",
			EndTime:    "00:00",
			DaysOfWeek: "[0]",
			Timezone:   "Asia/Tokyo",
		}

		// 2026-08-23 is Sunday
		sunNoon := time.Date(2026, 8, 23, 12, 0, 0, 0, jst)
		active, nextAvail := IsTimeInIgnoreWindow(sunNoon, w)
		assert.Assert(t, active)
		expected := time.Date(2026, 8, 24, 0, 0, 0, 0, jst)
		assert.Assert(t, nextAvail.Equal(expected))

		// Monday 12:00 (inactive)
		monNoon := time.Date(2026, 8, 24, 12, 0, 0, 0, jst)
		active, _ = IsTimeInIgnoreWindow(monNoon, w)
		assert.Assert(t, !active)
	})

	t.Run("Non-00:00 start equals end is NOT all-day", func(t *testing.T) {
		w := store.IgnoreWindow{
			ID:         "w-invalid-same",
			Name:       "Same time",
			StartTime:  "09:00",
			EndTime:    "09:00",
			DaysOfWeek: "[0,1,2,3,4,5,6]",
			Timezone:   "UTC",
		}
		noon := time.Date(2026, 8, 23, 12, 0, 0, 0, time.UTC)
		active, _ := IsTimeInIgnoreWindow(noon, w)
		assert.Assert(t, !active)
	})
}

func TestIgnoreWindow_EdgeCases(t *testing.T) {
	t.Run("invalid timezone falls back to UTC", func(t *testing.T) {
		w := store.IgnoreWindow{
			ID:         "w-invalid-tz",
			Name:       "Invalid TZ",
			StartTime:  "09:00",
			EndTime:    "17:00",
			DaysOfWeek: "[1,2,3,4,5]",
			Timezone:   "Invalid/Timezone_Name",
		}

		// 2026-08-19 (Wed) 10:00 UTC
		wedUTC := time.Date(2026, 8, 19, 10, 0, 0, 0, time.UTC)
		active, nextAvail := IsTimeInIgnoreWindow(wedUTC, w)
		assert.Assert(t, active)
		expected := time.Date(2026, 8, 19, 17, 0, 0, 0, time.UTC)
		assert.Assert(t, nextAvail.Equal(expected))
	})

	t.Run("empty timezone string falls back to UTC", func(t *testing.T) {
		w := store.IgnoreWindow{
			ID:         "w-empty-tz",
			Name:       "Empty TZ",
			StartTime:  "09:00",
			EndTime:    "17:00",
			DaysOfWeek: "[1,2,3,4,5]",
			Timezone:   "",
		}

		wedUTC := time.Date(2026, 8, 19, 10, 0, 0, 0, time.UTC)
		active, nextAvail := IsTimeInIgnoreWindow(wedUTC, w)
		assert.Assert(t, active)
		expected := time.Date(2026, 8, 19, 17, 0, 0, 0, time.UTC)
		assert.Assert(t, nextAvail.Equal(expected))
	})

	t.Run("invalid time format", func(t *testing.T) {
		w1 := store.IgnoreWindow{
			StartTime:  "invalid",
			EndTime:    "17:00",
			DaysOfWeek: "[1,2,3,4,5]",
		}
		active, _ := IsTimeInIgnoreWindow(time.Now(), w1)
		assert.Assert(t, !active)

		w2 := store.IgnoreWindow{
			StartTime:  "09:00",
			EndTime:    "25:00",
			DaysOfWeek: "[1,2,3,4,5]",
		}
		active, _ = IsTimeInIgnoreWindow(time.Now(), w2)
		assert.Assert(t, !active)

		w3 := store.IgnoreWindow{
			StartTime:  "09:60",
			EndTime:    "17:00",
			DaysOfWeek: "[1,2,3,4,5]",
		}
		active, _ = IsTimeInIgnoreWindow(time.Now(), w3)
		assert.Assert(t, !active)
	})

	t.Run("empty or malformed days of week", func(t *testing.T) {
		w1 := store.IgnoreWindow{
			StartTime:  "09:00",
			EndTime:    "17:00",
			DaysOfWeek: "[]",
		}
		active, _ := IsTimeInIgnoreWindow(time.Now(), w1)
		assert.Assert(t, !active)

		w2 := store.IgnoreWindow{
			StartTime:  "09:00",
			EndTime:    "17:00",
			DaysOfWeek: "",
		}
		active, _ = IsTimeInIgnoreWindow(time.Now(), w2)
		assert.Assert(t, !active)

		w3 := store.IgnoreWindow{
			StartTime:  "09:00",
			EndTime:    "17:00",
			DaysOfWeek: "{malformed}",
		}
		active, _ = IsTimeInIgnoreWindow(time.Now(), w3)
		assert.Assert(t, !active)
	})
}

func TestIgnoreWindow_AdjustNextFetch(t *testing.T) {
	t.Run("empty window list returns original time", func(t *testing.T) {
		now := time.Date(2026, 8, 19, 12, 0, 0, 0, time.UTC)
		adjusted := AdjustNextFetchForIgnoreWindows(now, nil)
		assert.Assert(t, adjusted.Equal(now))

		adjusted = AdjustNextFetchForIgnoreWindows(now, []store.IgnoreWindow{})
		assert.Assert(t, adjusted.Equal(now))
	})

	t.Run("single intraday window active", func(t *testing.T) {
		w := store.IgnoreWindow{
			StartTime:  "09:00",
			EndTime:    "17:00",
			DaysOfWeek: "[1,2,3,4,5]",
			Timezone:   "UTC",
		}
		// Wed 10:00 UTC -> should advance to Wed 17:00 UTC
		target := time.Date(2026, 8, 19, 10, 0, 0, 0, time.UTC)
		adjusted := AdjustNextFetchForIgnoreWindows(target, []store.IgnoreWindow{w})
		expected := time.Date(2026, 8, 19, 17, 0, 0, 0, time.UTC)
		assert.Assert(t, adjusted.Equal(expected))

		// Wed 18:00 UTC -> outside window, remains Wed 18:00 UTC
		outside := time.Date(2026, 8, 19, 18, 0, 0, 0, time.UTC)
		adjusted = AdjustNextFetchForIgnoreWindows(outside, []store.IgnoreWindow{w})
		assert.Assert(t, adjusted.Equal(outside))
	})

	t.Run("single overnight window active", func(t *testing.T) {
		w := store.IgnoreWindow{
			StartTime:  "23:00",
			EndTime:    "07:00",
			DaysOfWeek: "[1,2,3,4,5]",
			Timezone:   "UTC",
		}
		// Monday 23:30 -> Tuesday 07:00
		monEvening := time.Date(2026, 8, 17, 23, 30, 0, 0, time.UTC)
		adjusted := AdjustNextFetchForIgnoreWindows(monEvening, []store.IgnoreWindow{w})
		expected := time.Date(2026, 8, 18, 7, 0, 0, 0, time.UTC)
		assert.Assert(t, adjusted.Equal(expected))

		// Tuesday 05:00 -> Tuesday 07:00
		tueMorning := time.Date(2026, 8, 18, 5, 0, 0, 0, time.UTC)
		adjusted = AdjustNextFetchForIgnoreWindows(tueMorning, []store.IgnoreWindow{w})
		assert.Assert(t, adjusted.Equal(expected))
	})

	t.Run("overlapping ignore windows", func(t *testing.T) {
		w1 := store.IgnoreWindow{
			ID:         "w1",
			StartTime:  "09:00",
			EndTime:    "15:00",
			DaysOfWeek: "[1,2,3,4,5]",
			Timezone:   "UTC",
		}
		w2 := store.IgnoreWindow{
			ID:         "w2",
			StartTime:  "12:00",
			EndTime:    "18:00",
			DaysOfWeek: "[1,2,3,4,5]",
			Timezone:   "UTC",
		}

		// Wed 10:00 UTC -> in w1, ends at 15:00. But at 15:00 it's in w2, ends at 18:00.
		target := time.Date(2026, 8, 19, 10, 0, 0, 0, time.UTC)
		adjusted := AdjustNextFetchForIgnoreWindows(target, []store.IgnoreWindow{w1, w2})
		expected := time.Date(2026, 8, 19, 18, 0, 0, 0, time.UTC)
		assert.Assert(t, adjusted.Equal(expected))
	})

	t.Run("chained consecutive ignore windows", func(t *testing.T) {
		w1 := store.IgnoreWindow{
			ID:         "w1",
			StartTime:  "08:00",
			EndTime:    "12:00",
			DaysOfWeek: "[1,2,3,4,5]",
			Timezone:   "UTC",
		}
		w2 := store.IgnoreWindow{
			ID:         "w2",
			StartTime:  "12:00",
			EndTime:    "16:00",
			DaysOfWeek: "[1,2,3,4,5]",
			Timezone:   "UTC",
		}
		w3 := store.IgnoreWindow{
			ID:         "w3",
			StartTime:  "16:00",
			EndTime:    "20:00",
			DaysOfWeek: "[1,2,3,4,5]",
			Timezone:   "UTC",
		}

		target := time.Date(2026, 8, 19, 9, 0, 0, 0, time.UTC)
		adjusted := AdjustNextFetchForIgnoreWindows(target, []store.IgnoreWindow{w1, w2, w3})
		expected := time.Date(2026, 8, 19, 20, 0, 0, 0, time.UTC)
		assert.Assert(t, adjusted.Equal(expected))
	})

	t.Run("all-day chained weekend windows", func(t *testing.T) {
		w := store.IgnoreWindow{
			StartTime:  "00:00",
			EndTime:    "24:00",
			DaysOfWeek: "[0,6]", // Sat, Sun
			Timezone:   "UTC",
		}

		// Saturday 10:00 UTC -> advances to Sunday 00:00 -> in window -> advances to Monday 00:00 UTC
		sat := time.Date(2026, 8, 22, 10, 0, 0, 0, time.UTC)
		adjusted := AdjustNextFetchForIgnoreWindows(sat, []store.IgnoreWindow{w})
		expected := time.Date(2026, 8, 24, 0, 0, 0, 0, time.UTC)
		assert.Assert(t, adjusted.Equal(expected))
	})

	t.Run("infinite loop protection with full week 24h blackout", func(t *testing.T) {
		w := store.IgnoreWindow{
			StartTime:  "00:00",
			EndTime:    "24:00",
			DaysOfWeek: "[0,1,2,3,4,5,6]",
			Timezone:   "UTC",
		}
		start := time.Date(2026, 8, 19, 10, 0, 0, 0, time.UTC)
		// Should terminate without freezing
		adjusted := AdjustNextFetchForIgnoreWindows(start, []store.IgnoreWindow{w})
		assert.Assert(t, adjusted.After(start))
	})
}
