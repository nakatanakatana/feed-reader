import { createSignal } from "solid-js";
import { css } from "../../styled-system/css";
import { flex, stack } from "../../styled-system/patterns";
import { createURLParsingRule } from "../lib/blocking-db";
import { ActionButton } from "./ui/ActionButton";

export function AddParsingRuleForm() {
  const [domain, setDomain] = createSignal("");
  const [pattern, setPattern] = createSignal("");

  const handleSubmit = async (e: Event) => {
    e.preventDefault();
    if (!domain() || !pattern()) return;
    await createURLParsingRule({ domain: domain(), pattern: pattern() });
    setDomain("");
    setPattern("");
  };

  const inputStyle = css({
    border: "1px solid",
    borderColor: "gray.300",
    padding: "2",
    borderRadius: "md",
    width: "full",
    fontSize: "sm",
    _focus: {
      outline: "none",
      borderColor: "blue.500",
    },
  });

  const labelStyle = css({
    display: "block",
    fontSize: "xs",
    fontWeight: "bold",
    marginBottom: "1",
    color: "gray.500",
  });

  return (
    <div class={flex({ flexDirection: "column", gap: "2", width: "full" })}>
      <form
        onSubmit={handleSubmit}
        class={flex({
          gap: { base: "2", md: "4" },
          alignItems: "flex-start",
          flexDirection: "column",
          width: "full",
          bg: "white",
          p: { base: "2", md: "4" },
          rounded: "md",
          shadow: "sm",
          border: "1px solid",
          borderColor: "gray.200",
        })}
      >
        <div class={stack({ gap: "4", width: "full" })}>
          <div
            class={flex({
              gap: "4",
              width: "full",
              flexDirection: { base: "column", md: "row" },
            })}
          >
            <div class={css({ flex: "1" })}>
              <label for="url-domain" class={labelStyle}>
                Domain
              </label>
              <input
                id="url-domain"
                type="text"
                placeholder="e.g. example.com"
                value={domain()}
                onInput={(e) => setDomain(e.currentTarget.value)}
                class={inputStyle}
              />
            </div>
            <div class={css({ flex: "2" })}>
              <label for="url-pattern" class={labelStyle}>
                Regex Pattern (first group is username)
              </label>
              <input
                id="url-pattern"
                type="text"
                placeholder="^https://example\.com/users/([^/]+)"
                value={pattern()}
                onInput={(e) => setPattern(e.currentTarget.value)}
                class={inputStyle}
              />
            </div>
            <div class={css({ display: "flex", alignItems: "flex-end" })}>
              <ActionButton type="submit" variant="primary">
                Add Rule
              </ActionButton>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
