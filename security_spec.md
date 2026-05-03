# Security Specification - EquipTrace AI

## 1. Data Invariants
- An Item cannot be checked out unless it is 'available'.
- A user cannot check out an item if they have reached their `itemLimit` or have `hasOverdue` items.
- All actions must be logged.
- Only admins can add or delete items/users.
- Staff can check items in/out but cannot modify item metadata (name/category/barcodeId).

## 2. The Dirty Dozen Payloads (Targeted for PERMISSION_DENIED)

1. **Identity Spoofing (Items):** Non-admin trying to delete an item.
2. **Identity Spoofing (Users):** Non-admin trying to create a new user with 'admin' role.
3. **Ghost Field Injection:** Trying to update an item with a field `isPremium: true` that doesn't exist in schema.
4. **Invalid Status Transition:** Trying to update an item status from 'lost' to 'checked_out' directly without clearing.
5. **Ownership Bypass:** User A trying to check in an item that User B is holding (Wait, staff should be able to check in items for anyone, but maybe not random users? Let's say only staff/admin can check in).
6. **Immutable Field Attack:** Trying to change the `barcodeId` of an item after creation.
7. **Resource Exhaustion:** Trying to set a `name` that is 5MB.
8. **ID Poisoning:** Trying to create an item with barcode `../../etc/passwd`.
9. **Role Escalation:** Staff trying to promote themselves to admin by modifying their own user doc in `/users`.
10. **State Shortcutting:** Checking out an item without setting a `holderId`.
11. **PII Leak:** An authenticated student trying to read the email address of another staff member (if we isolate PII).
12. **Temporal Attack:** Trying to set `lastActionAt` to a date in the past instead of `request.time`.

## 3. Test Runner (Draft Plan)
I will implement `firestore.rules` and use the built-in validators to prevent these.
