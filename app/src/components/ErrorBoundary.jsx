import React from "react";
import { InlineNotification, Button } from "@carbon/react";
import { Renew } from "@carbon/icons-react";

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    console.error("Uventet feil:", error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <main style={{ padding: "48px 20px", maxWidth: 540, margin: "0 auto" }}>
          <InlineNotification
            kind="error"
            title="Noe gikk galt"
            subtitle="Et uventet problem oppsto. Last siden på nytt for å fortsette."
            hideCloseButton
          />
          <Button
            kind="secondary"
            renderIcon={Renew}
            onClick={() => window.location.reload()}
            style={{ marginTop: 16 }}
          >
            Last siden på nytt
          </Button>
        </main>
      );
    }
    return this.props.children;
  }
}
