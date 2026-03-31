export const CLAUDE_MENU_TASK_PROMPT = `
Please read ./menu_feature_request.ts first.

Then do the following in order:
1. Inspect the current project structure and find all files related to menu management.
2. Read the files related to:
   - menu form
   - menu table/list page
   - validators / schema
   - API / service / repository for menu
   - menu-link setup route/page
3. Summarize the current architecture and conventions before making changes.
4. Show me:
   - files inspected
   - files that need changes
   - implementation plan
   - possible risks
5. Then implement the requested feature with minimal impact.

Requirements are defined in MENU_FEATURE_REQUEST inside menu_feature_request.ts.

Important rules:
- do not code before reading related files
- follow existing patterns and naming conventions
- do not add unnecessary dependencies
- do not refactor unrelated code
- display menu type labels instead of raw numeric ids where needed
- add filter/search by menuTypeId
- add action to navigate to the menu-link setup page
- keep the code clean, typed, and easy to review

Final output must include:
1. changed files
2. summary of each change
3. risks / assumptions
4. manual test steps
`;
