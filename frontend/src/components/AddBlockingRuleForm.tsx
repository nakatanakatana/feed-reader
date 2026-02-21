import { createSignal } from "solid-js";
import { css } from "../../styled-system/css";
import { flex, stack } from "../../styled-system/patterns";
import { createBlockingRule } from "../lib/blocking-db";
import { ActionButton } from "./ui/ActionButton";

interface AddBlockingRuleFormProps {
  onBulkImport?: () => void;
}

export function AddBlockingRuleForm(props: AddBlockingRuleFormProps) {
  const [blockType, setBlockType] = createSignal("user_domain");
  const [blockUsername, setBlockUsername] = createSignal("");
  const [blockDomain, setBlockDomain] = createSignal("");
  const [blockKeyword, setBlockKeyword] = createSignal("");

  const handleSubmit = async (e: Event) => {
    e.preventDefault();
    const type = blockType();
    if (type === "user_domain") {
      if (!blockUsername() && !blockDomain()) return;
      await createBlockingRule({
        ruleType: type,
        username: blockUsername() || undefined,
        domain: blockDomain() || undefined,
      });
    } else {
      if (!blockKeyword()) return;
      await createBlockingRule({
        ruleType: type,
        keyword: blockKeyword(),
      });
    }
    setBlockUsername("");
    setBlockDomain("");
    setBlockKeyword("");
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
              <label for="block-type" class={labelStyle}>
                Rule Type
              </label>
              <select
                id="block-type"
                value={blockType()}
                onChange={(e) => setBlockType(e.currentTarget.value)}
                class={inputStyle}
              >
                <option value="user_domain">User/Domain Block</option>
                <option value="keyword">Keyword Block</option>
              </select>
            </div>

            {blockType() === "user_domain" ? (
              <>
                <div class={css({ flex: "1" })}>
                  <label for="block-username" class={labelStyle}>
                    Username (Optional)
                  </label>
                  <input
                    id="block-username"
                    type="text"
                    placeholder="spammer"
                    value={blockUsername()}
                    onInput={(e) => setBlockUsername(e.currentTarget.value)}
                    class={inputStyle}
                  />
                </div>
                <div class={css({ flex: "1" })}>
                  <label for="block-domain" class={labelStyle}>
                    Domain (Optional)
                  </label>
                  <input
                    id="block-domain"
                    type="text"
                    placeholder="example.com"
                    value={blockDomain()}
                    onInput={(e) => setBlockDomain(e.currentTarget.value)}
                    class={inputStyle}
                  />
                </div>
              </>
            ) : (
              <div class={css({ flex: "2" })}>
                <label for="block-keyword" class={labelStyle}>
                  Keyword
                </label>
                <input
                  id="block-keyword"
                  type="text"
                  placeholder="SPAM"
                  value={blockKeyword()}
                  onInput={(e) => setBlockKeyword(e.currentTarget.value)}
                  class={inputStyle}
                />
              </div>
            )}

            <div
              class={css({ display: "flex", alignItems: "flex-end", gap: "2" })}
            >
              <ActionButton type="submit" variant="primary">
                Add Rule
              </ActionButton>
              {props.onBulkImport && (
                <ActionButton
                  type="button"
                  variant="secondary"
                  onClick={props.onBulkImport}
                >
                  Bulk Import
                </ActionButton>
              )}
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}

