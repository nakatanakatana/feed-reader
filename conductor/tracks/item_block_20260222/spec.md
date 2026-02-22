### Track Specification: Item Hiding (Block) Feature based on URL Parsing

**Overview**
Implement a backend feature to hide items (Items) based on user information parsed from URLs, domains, or keywords. This feature will involve management tables and APIs for URL parsing rules, item block rules, and the storage of blocked item associations.

**Functional Requirements**
1.  **URL Parsing Rule Management**
    -   Create a table `url_parsing_rules` to store configurations for extracting user information from item URLs.
    -   Support both "subdomain-based (`<user>.<basedomain>`)" and "path-based (`<domain>/<user>`)" formats.
    -   Implement APIs to add and delete URL parsing rules.
2.  **Item Block Rule Management**
    -   Create a table `item_block_rules` to store rules for hiding items.
    -   Support the following criteria for hiding using a `type` column:
        -   `user`: Specific user
        -   `domain`: Specific domain
        -   `user_domain`: User + Domain combination
        -   `keyword`: Specific keyword
    -   Implement APIs to add and delete item block rules.
    -   Implement an API to bulk add block rules.
3.  **Blocked Item Storage and Calculation**
    -   Create a table `item_blocks` to store the association between items and block rules (i.e., which items are blocked).
    -   **Calculation on Rule Addition**: When a new `item_block_rule` is added, scan existing items and populate the `item_blocks` table for those matching the new rule.
    -   **Calculation on Item Fetch**: When a new item is fetched/stored, check it against all active `item_block_rules`. If it matches, record the association in the `item_blocks` table.
4.  **Item Filtering at Retrieval**
    -   Filter items in retrieval APIs (e.g., `ListItems`) by excluding those present in the `item_blocks` table.
    -   This allows for efficient querying as the block status is pre-calculated.

**Acceptance Criteria**
-   User information is correctly extracted from item URLs based on configured patterns.
-   Adding a block rule automatically populates `item_blocks` for existing matching items.
-   Newly fetched items matching block rules are automatically added to `item_blocks`.
-   Items in `item_blocks` are correctly excluded from item list API responses.
-   CRUD operations for rules are functional via API.
