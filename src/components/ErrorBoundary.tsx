"use client";

import { Component, type ReactNode } from "react";

/**
 * Shows `fallback` instead of its children if they throw while rendering,
 * so one broken part (an image that won't load) can't take down the page.
 */
export class ErrorBoundary extends Component<
  { fallback: ReactNode; children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: unknown) {
    console.warn("Part of the page couldn't be shown", error);
  }

  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}
