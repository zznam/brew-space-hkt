# Loan action hit targets

Status: resolved, 14/11/2026. Found during visual review of the phone handoff queue.

The cancel button used absolute positioning at the top right of a loan row. Its 44 px hit target overlapped the handoff button by 22 px vertically at a 320 px viewport. Browser geometry confirmed intersection; a regression assertion requiring no intersection failed.

The fix keeps cancellation in the flex flow and allows the information column to shrink to 80 px. Neither the action handlers nor inventory behavior changed. The same geometry assertion passes at 320, 375, 414 and 480 px. Both buttons keep their 44 px minimum touch targets.
