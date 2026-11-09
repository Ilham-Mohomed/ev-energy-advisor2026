# EV Energy Advisor — Fresh Project

A new independent Expo project. It does not use the previous GitHub repository.

Included: Customer and Utility Officer role selection, profile fields, editable EV and tariff assumptions, editable utility assumptions, six-scenario carousel rotating every 10 seconds, Find Best Scenario loading state, preliminary ranking and BEP/BEP-gap display once four annual cost inputs are supplied.

Important: Sign-in is a UI prototype, not secure production authentication. Data is currently held in app memory and is not synced between devices. Production needs secure authentication, a database, role-based permissions, backups and privacy/security review.

The ranking is indicative only. Scenario-specific BEP formulas and cash flows must be calibrated against the approved research workbook before official use. The utility screen includes annual prosumer and utility fixed/variable cost fields because the tariff values alone are not sufficient to calculate validated BEPs.

Targets: Android APK and iOS via Expo EAS; responsive web target for Windows browsers. A Windows desktop installer needs an additional packaging step.

Create a brand-new GitHub repository and upload these files. Do not use the old repository. Add a new EXPO_TOKEN secret to the new repository and create a separate Expo project. For iOS distribution, configure Apple Developer credentials.
