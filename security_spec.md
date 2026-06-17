# Security Specification - Ordem de Serviço Remaf

## 1. Data Invariants
- **Authentication**: All read, write, create, and list operations on `OrdemDeServico` require the client to be authenticated (`request.auth != null`).
- **Owner & Technician Verification**: The technician completing the OS must register their authenticated UID.
- **Strict Fields**: During creation, the `id`, `numeroOS`, `dataAbertura`, `horaAbertura`, `equipamento`, `placa`, and `tecnico` are required, and must be validated.
- **Status Locking**: Once status is finalized, state short-cutting is gated.
- **Sanity Limits**: String sizes for inputs (equipment name, license plates, technician names) are capped to prevent Denial of Wallet.

## 2. The Dirty Dozen Payloads (Vulnerability Scenarios)
1. **Unauthenticated Write**: Creating an OS record without a valid auth token.
2. **OS Number Poisoning**: Creating an OS with empty or negative-sequenced number string.
3. **Invalid ID Injection**: Passing highly bloated, malicious string IDs.
4. **Incorrect Data Formats**: Sending integers or boolean values into text string fields.
5. **No Equipment Name**: Bypassing mandatory fields during creation.
6. **Malicious Base64 Payload**: Injecting massive 5MB payloads in text comments instead of storage paths.
7. **License Plate Poisoning**: Registering structured placa with hundreds of characters.
8. **Immutability Bypass**: Altering original OS numbers after creation in standard updates.
9. **Status Tampering**: Bypassing steps using updates to mark service as "Concluído" without standard before-photos.
10. **Hijacking and Admin Escapes**: Forging UID or pretending to be other mechanics.
11. **Blanket Query Scraping**: Listing all data without proper index controls.
12. **Future Timestamping**: Pushing client-controlled future date timestamps in conclusion.

The rules safeguard these vectors by enforcing:
1. `request.auth != null` validation.
2. Strictly typed `isValidOrdemDeServico(data)` rules.
3. Proper size caps on strings and arrays.
4. Immortality constraints on sequence numbers and initialization timestamps.
