import { createHandler } from './handler.mjs';
// Compatibility response for older app versions. No AI keys or services are used.
Deno.serve(createHandler());
