// Wrapper module for @react-pdf/renderer
// This wrapper explicitly exports only what we need, avoiding the Html component
// that conflicts with Next.js's Html from next/document

import "server-only";

// Re-export only the components we use
export {
  Document,
  Page,
  Text,
  View,
  Image,
  StyleSheet,
  Font,
  renderToBuffer,
  renderToStream,
  pdf,
} from "@react-pdf/renderer";

// Re-export types
export type { Style } from "@react-pdf/types";
