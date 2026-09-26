# Intercepta — API feedback

## Friction log

- Docs publish no example response bodies and no score scale for `toxicScore` / trait `risk`; verdict mapping is based on trait names and enums until live data is seen.
- Scan Message `messageType` enum lists only Permit variants; unclear whether EIP-3009 `TransferWithAuthorization` (what x402 signs) is understood.
- Address scans take no chainId, so it's unclear which chain(s) they cover.
- Scan Message `message` is typed `string, format: json` — has to be a stringified typed-data object; easy to get wrong.
- Sandbox keys are emailed "within a few hours", which blocks the first call during a hackathon.
- Scan Message: the docs type `message` as `string, format: json`, but a stringified typed-data message is silently parsed as empty (null domain, no messageType, riskGroup Low). Sent as a JSON object it works: `TransferWithAuthorization` is recognised and a payTo on the phishing list returns High / KNOWN_MALICIOUS.
- Quick Scan Address returns 404 "An Externally Owned Account with this address doesn't exist" for contract addresses.
- The docs' example address (0x0d77…6e47) returns toxicScore 0; the OFAC-listed Ronin exploiter returns toxicScore 100 with known_scammer, sanction_address and blacklist.
