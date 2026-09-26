# Intercepta — API feedback

## Friction log

- Docs publish no example response bodies and no score scale for `toxicScore` / trait `risk`; verdict mapping is based on trait names and enums until live data is seen.
- Scan Message `messageType` enum lists only Permit variants; unclear whether EIP-3009 `TransferWithAuthorization` (what x402 signs) is understood.
- Address scans take no chainId, so it's unclear which chain(s) they cover.
- Scan Message `message` is typed `string, format: json` — has to be a stringified typed-data object; easy to get wrong.
- Sandbox keys are emailed "within a few hours", which blocks the first call during a hackathon.
