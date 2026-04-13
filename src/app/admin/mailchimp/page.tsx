"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Mail,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Users,
  Send,
  AlertCircle,
  Loader2,
} from "lucide-react";

interface ConnectionResult {
  success: boolean;
  message?: string;
  error?: string;
  audience?: {
    name: string;
    memberCount: number;
  };
  configStatus?: {
    hasApiKey: boolean;
    hasPrefix: boolean;
    hasAudienceId: boolean;
  };
  details?: {
    hasApiKey: boolean;
    hasPrefix: boolean;
    hasAudienceId: boolean;
  };
}

interface SubscribeResult {
  success: boolean;
  message?: string;
  error?: string;
}

export default function MailchimpAdminPage() {
  const [connectionResult, setConnectionResult] = useState<ConnectionResult | null>(null);
  const [subscribeResult, setSubscribeResult] = useState<SubscribeResult | null>(null);
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [isSubscribing, setIsSubscribing] = useState(false);
  const [testEmail, setTestEmail] = useState("");
  const [testName, setTestName] = useState("");

  const testConnection = async () => {
    setIsTestingConnection(true);
    setConnectionResult(null);

    try {
      const response = await fetch("/api/mailchimp/test");
      const data = await response.json();
      setConnectionResult(data);
    } catch (error) {
      setConnectionResult({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        message: "Failed to connect to the test endpoint",
      });
    } finally {
      setIsTestingConnection(false);
    }
  };

  const testSubscribe = async () => {
    if (!testEmail) {
      setSubscribeResult({
        success: false,
        error: "Please enter an email address",
      });
      return;
    }

    setIsSubscribing(true);
    setSubscribeResult(null);

    try {
      const response = await fetch("/api/newsletter/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: testEmail,
          name: testName || undefined,
          source: "admin-test",
        }),
      });

      const data = await response.json();
      setSubscribeResult({
        success: data.success,
        message: data.success ? "Subscriber added successfully!" : undefined,
        error: data.error,
      });
    } catch (error) {
      setSubscribeResult({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setIsSubscribing(false);
    }
  };

  return (
    <div className="p-6 lg:p-8 space-y-8">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-3 bg-amber-500/20 rounded-xl">
          <Mail className="w-6 h-6 text-amber-500" />
        </div>
        <div>
          <h1 className="text-2xl font-oswald uppercase text-white">Mailchimp</h1>
          <p className="text-slc-muted text-sm">Test your Mailchimp integration</p>
        </div>
      </div>

      {/* Connection Test Card */}
      <div className="bg-slc-card border border-slc-border rounded-xl p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-lg font-bold text-white">Connection Test</h2>
            <p className="text-slc-muted text-sm">Verify Mailchimp API credentials</p>
          </div>
          <Button
            onClick={testConnection}
            disabled={isTestingConnection}
            className="bg-amber-500 hover:bg-amber-600 text-black"
          >
            {isTestingConnection ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Testing...
              </>
            ) : (
              <>
                <RefreshCw className="w-4 h-4 mr-2" />
                Test Connection
              </>
            )}
          </Button>
        </div>

        {/* Results */}
        {connectionResult && (
          <div
            className={`rounded-xl p-4 ${
              connectionResult.success
                ? "bg-emerald-500/10 border border-emerald-500/30"
                : "bg-red-500/10 border border-red-500/30"
            }`}
          >
            <div className="flex items-start gap-3">
              {connectionResult.success ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-500 mt-0.5" />
              ) : (
                <XCircle className="w-5 h-5 text-red-500 mt-0.5" />
              )}
              <div className="flex-1">
                <p
                  className={`font-medium ${
                    connectionResult.success ? "text-emerald-400" : "text-red-400"
                  }`}
                >
                  {connectionResult.success ? "Connection Successful!" : "Connection Failed"}
                </p>
                <p className="text-sm text-slc-muted mt-1">
                  {connectionResult.message || connectionResult.error}
                </p>

                {/* Audience Info */}
                {connectionResult.audience && (
                  <div className="mt-4 p-3 bg-slc-dark rounded-lg">
                    <div className="flex items-center gap-2 text-white">
                      <Users className="w-4 h-4 text-amber-500" />
                      <span className="font-medium">{connectionResult.audience.name}</span>
                    </div>
                    <p className="text-sm text-slc-muted mt-1">
                      {connectionResult.audience.memberCount.toLocaleString()} subscribers
                    </p>
                  </div>
                )}

                {/* Config Status */}
                {(connectionResult.configStatus || connectionResult.details) && (
                  <div className="mt-4 space-y-2">
                    <p className="text-sm font-medium text-white">Configuration Status:</p>
                    <div className="grid gap-2">
                      {["hasApiKey", "hasPrefix", "hasAudienceId"].map((key) => {
                        const status = connectionResult.configStatus || connectionResult.details;
                        const value = status?.[key as keyof typeof status];
                        return (
                          <div key={key} className="flex items-center gap-2 text-sm">
                            {value ? (
                              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                            ) : (
                              <XCircle className="w-4 h-4 text-red-500" />
                            )}
                            <span className={value ? "text-emerald-400" : "text-red-400"}>
                              {key === "hasApiKey" && "API Key"}
                              {key === "hasPrefix" && "Server Prefix"}
                              {key === "hasAudienceId" && "Audience ID"}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Test Subscription Card */}
      <div className="bg-slc-card border border-slc-border rounded-xl p-6">
        <div className="mb-6">
          <h2 className="text-lg font-bold text-white">Test Subscription</h2>
          <p className="text-slc-muted text-sm">Add a test subscriber to verify the full flow</p>
        </div>

        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-slc-muted mb-2">
                Email Address *
              </label>
              <Input
                type="email"
                placeholder="test@example.com"
                value={testEmail}
                onChange={(e) => setTestEmail(e.target.value)}
                className="bg-slc-dark border-slc-border"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slc-muted mb-2">
                Name (optional)
              </label>
              <Input
                type="text"
                placeholder="John Doe"
                value={testName}
                onChange={(e) => setTestName(e.target.value)}
                className="bg-slc-dark border-slc-border"
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-amber-500" />
            <p className="text-sm text-slc-muted">
              This will add a real subscriber to your Mailchimp audience with the &quot;Crew&quot; tag.
            </p>
          </div>

          <Button
            onClick={testSubscribe}
            disabled={isSubscribing || !testEmail}
            className="bg-primary hover:bg-primary/90"
          >
            {isSubscribing ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Subscribing...
              </>
            ) : (
              <>
                <Send className="w-4 h-4 mr-2" />
                Test Subscribe
              </>
            )}
          </Button>

          {/* Subscribe Result */}
          {subscribeResult && (
            <div
              className={`rounded-xl p-4 ${
                subscribeResult.success
                  ? "bg-emerald-500/10 border border-emerald-500/30"
                  : "bg-red-500/10 border border-red-500/30"
              }`}
            >
              <div className="flex items-center gap-3">
                {subscribeResult.success ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                ) : (
                  <XCircle className="w-5 h-5 text-red-500" />
                )}
                <p
                  className={
                    subscribeResult.success ? "text-emerald-400" : "text-red-400"
                  }
                >
                  {subscribeResult.message || subscribeResult.error}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Environment Variables Info */}
      <div className="bg-slc-card border border-slc-border rounded-xl p-6">
        <h2 className="text-lg font-bold text-white mb-4">Required Environment Variables</h2>
        <div className="space-y-3 font-mono text-sm">
          <div className="p-3 bg-slc-dark rounded-lg">
            <code className="text-amber-500">MAILCHIMP_API_KEY</code>
            <p className="text-slc-muted text-xs mt-1">Your Mailchimp API key</p>
          </div>
          <div className="p-3 bg-slc-dark rounded-lg">
            <code className="text-amber-500">MAILCHIMP_SERVER_PREFIX</code>
            <p className="text-slc-muted text-xs mt-1">
              Server prefix from your API key (e.g., us21, us14)
            </p>
          </div>
          <div className="p-3 bg-slc-dark rounded-lg">
            <code className="text-amber-500">MAILCHIMP_AUDIENCE_ID</code>
            <p className="text-slc-muted text-xs mt-1">
              Your Mailchimp audience/list ID
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
