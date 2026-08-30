# Capability analyzer safety notes

The analyzer downloads one submitted HTML document, with a seven-second timeout
and a one-megabyte response limit. It accepts only `http` and `https`, does not
execute JavaScript, and rejects credentials, unspecified hosts, and common
private IP-literal ranges. `localhost` and `127.0.0.1` remain supported for the
competition demo.

This MVP does not resolve DNS before fetching, so production should add a
network egress policy, DNS/IP allowlisting after resolution, redirect controls,
and authenticated per-merchant rate limits to protect against DNS rebinding and
other SSRF routes.
