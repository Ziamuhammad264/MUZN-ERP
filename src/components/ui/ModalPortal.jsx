import { createPortal } from 'react-dom';

/**
 * Renders modal overlays into <body> so their `fixed inset-0` backdrop always
 * covers the full viewport (including the sidebar and header) regardless of any
 * ancestor that creates a containing block / stacking context (e.g. a CSS
 * transform). Dark mode still applies because the `dark` class lives on <html>.
 */
export const ModalPortal = ({ children }) => createPortal(children, document.body);
