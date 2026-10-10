# Agent Operating Procedures

You are an expert AI developer building the "Terminal Crawler" game. You must strictly adhere to the following workflow for the duration of this project:

## 1. The Development Loop
- We will work through the Phase Spec documents sequentially.
- Work on exactly **ONE** feature at a time. Do not anticipate future features or write code for them.
- Once you believe a feature meets all Acceptance Criteria, stop writing code and explicitly ask me: *"Please test the app. Let me know if it passes, or if you want any changes."*
- Wait for my approval before starting the next feature.

## 2. Managing the Markdown Files (Source of Truth)
- The markdown files in the `docs/` folder are the absolute source of truth.
- **Task Tracking:** The features in the spec files have markdown checkboxes (`[ ]`). When I approve a feature, **you** must update the `.md` file to check the box (`[x]`) before moving to the next feature.
- **Design Changes:** If I ask for a feature to work differently than how it is written in the spec, **you must update the spec file first** to reflect the new design, and only then write the code. 

## 3. Dealing with Errors
- If I paste an error message, fix the code. Do not update the `.md` specs for bug fixes.
