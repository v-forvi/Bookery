"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { trpc } from "@/client/trpc";
import { Loader2, Key, Check, Eye, EyeOff, Trash2 } from "lucide-react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function SettingsPage() {
  const [showKeys, setShowKeys] = useState(false);
  const utils = trpc.useUtils();

  // API keys
  const { data: preferredApi } = trpc.settings.get.useQuery({ key: "preferred_vision_api" });
  const { data: claudeKey } = trpc.settings.get.useQuery({ key: "claude_api_key" });
  const { data: geminiKey } = trpc.settings.get.useQuery({ key: "gemini_api_key" });
  const { data: glmKey } = trpc.settings.get.useQuery({ key: "glm_api_key" });

  const setSetting = trpc.settings.set.useMutation({
    onSuccess: () => {
      utils.settings.get.invalidate();
    },
  });

  const deleteSetting = trpc.settings.delete.useMutation({
    onSuccess: () => {
      utils.settings.get.invalidate();
    },
  });

  const [localKeys, setLocalKeys] = useState({
    claude: "",
    gemini: "",
    glm: "",
    preferred: preferredApi || "claude",
  });

  const handleSaveKey = async (key: "claude_api_key" | "gemini_api_key" | "glm_api_key", value: string) => {
    await setSetting.mutateAsync({ key, value });
    const localKey = key === "claude_api_key" ? "claude" : key === "gemini_api_key" ? "gemini" : "glm";
    setLocalKeys({ ...localKeys, [localKey]: "" });
  };

  const handleDeleteKey = async (key: "claude_api_key" | "gemini_api_key" | "glm_api_key") => {
    if (confirm("Are you sure you want to delete this API key? You'll need to add it again to use the vision service.")) {
      await deleteSetting.mutateAsync({ key });
    }
  };

  const handleSetPreferred = async (api: "claude" | "gemini" | "glm") => {
    await setSetting.mutateAsync({ key: "preferred_vision_api", value: api });
  };

  const hasClaudeKey = claudeKey && claudeKey.length > 0;
  const hasGeminiKey = geminiKey && geminiKey.length > 0;
  const hasGlmKey = glmKey && glmKey.length > 0;
  const preferred = preferredApi || "claude";

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black">
      <header className="border-b border-zinc-200 bg-white/95 backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/95">
        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-4">
            <Link href="/">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">
              Settings
            </h1>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
        <Tabs defaultValue="api" className="space-y-6">
          <TabsList>
            <TabsTrigger value="api">API Configuration</TabsTrigger>
            <TabsTrigger value="data">Data & Backup</TabsTrigger>
            <TabsTrigger value="about">About</TabsTrigger>
          </TabsList>

          {/* API Configuration Tab */}
          <TabsContent value="api" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Vision API Configuration</CardTitle>
                <CardDescription>
                  Configure your AI vision API for book extraction from shelf photos
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Preferred API Selection */}
                <div>
                  <Label>Preferred Vision API</Label>
                  <p className="text-sm text-zinc-500 mb-3">
                    Choose which API to use for book extraction
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <button
                      onClick={() => handleSetPreferred("claude")}
                      className={`rounded-lg border-2 p-4 text-left transition-colors ${
                        preferred === "claude"
                          ? "border-blue-500 bg-blue-50 dark:bg-blue-950"
                          : "border-zinc-200 hover:border-zinc-300 dark:border-zinc-800"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium">Claude</span>
                        {preferred === "claude" && <Check className="h-4 w-4 text-blue-500" />}
                      </div>
                      <p className="text-xs text-zinc-500">
                        Excellent accuracy
                      </p>
                    </button>

                    <button
                      onClick={() => handleSetPreferred("gemini")}
                      className={`rounded-lg border-2 p-4 text-left transition-colors ${
                        preferred === "gemini"
                          ? "border-blue-500 bg-blue-50 dark:bg-blue-950"
                          : "border-zinc-200 hover:border-zinc-300 dark:border-zinc-800"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium">Gemini</span>
                        {preferred === "gemini" && <Check className="h-4 w-4 text-blue-500" />}
                      </div>
                      <p className="text-xs text-zinc-500">
                        Free tier available
                      </p>
                    </button>

                    <button
                      onClick={() => handleSetPreferred("glm")}
                      className={`rounded-lg border-2 p-4 text-left transition-colors ${
                        preferred === "glm"
                          ? "border-blue-500 bg-blue-50 dark:bg-blue-950"
                          : "border-zinc-200 hover:border-zinc-300 dark:border-zinc-800"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium">GLM (Z.AI)</span>
                        {preferred === "glm" && <Check className="h-4 w-4 text-blue-500" />}
                      </div>
                      <p className="text-xs text-zinc-500">
                        Chinese-optimized
                      </p>
                    </button>
                  </div>
                </div>

                <hr className="border-zinc-200 dark:border-zinc-800" />

                {/* Claude API Key */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <Label htmlFor="claude-key">Claude API Key</Label>
                    {hasClaudeKey && (
                      <span className="flex items-center text-sm text-green-600">
                        <Check className="h-3 w-3 mr-1" />
                        Configured
                      </span>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Input
                        id="claude-key"
                        type={showKeys ? "text" : "password"}
                        placeholder="sk-ant-..."
                        value={localKeys.claude || (showKeys ? claudeKey || "" : "••••••••••••••••")}
                        onChange={(e) => setLocalKeys({ ...localKeys, claude: e.target.value })}
                      />
                      <button
                        type="button"
                        onClick={() => setShowKeys(!showKeys)}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600"
                      >
                        {showKeys ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    <Button
                      onClick={() => handleSaveKey("claude_api_key", localKeys.claude)}
                      disabled={!localKeys.claude || setSetting.isPending}
                    >
                      {setSetting.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        "Save"
                      )}
                    </Button>
                    {hasClaudeKey && (
                      <Button
                        variant="destructive"
                        size="icon"
                        onClick={() => handleDeleteKey("claude_api_key")}
                        disabled={deleteSetting.isPending}
                        title="Delete key"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                  <p className="text-xs text-zinc-500 mt-1">
                    Get your key at{" "}
                    <a
                      href="https://console.anthropic.com/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline"
                    >
                      console.anthropic.com
                    </a>
                  </p>
                </div>

                <hr className="border-zinc-200 dark:border-zinc-800" />

                {/* Gemini API Key */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <Label htmlFor="gemini-key">Gemini API Key</Label>
                    {hasGeminiKey && (
                      <span className="flex items-center text-sm text-green-600">
                        <Check className="h-3 w-3 mr-1" />
                        Configured
                      </span>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Input
                        id="gemini-key"
                        type={showKeys ? "text" : "password"}
                        placeholder="AIza..."
                        value={localKeys.gemini || (showKeys ? geminiKey || "" : "••••••••••••••••")}
                        onChange={(e) => setLocalKeys({ ...localKeys, gemini: e.target.value })}
                      />
                    </div>
                    <Button
                      onClick={() => handleSaveKey("gemini_api_key", localKeys.gemini)}
                      disabled={!localKeys.gemini || setSetting.isPending}
                    >
                      {setSetting.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        "Save"
                      )}
                    </Button>
                    {hasGeminiKey && (
                      <Button
                        variant="destructive"
                        size="icon"
                        onClick={() => handleDeleteKey("gemini_api_key")}
                        disabled={deleteSetting.isPending}
                        title="Delete key"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                  <p className="text-xs text-zinc-500 mt-1">
                    Get your key at{" "}
                    <a
                      href="https://makersuite.google.com/app/apikey"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline"
                    >
                      makersuite.google.com
                    </a>
                  </p>
                </div>

                <hr className="border-zinc-200 dark:border-zinc-800" />

                {/* GLM API Key */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <Label htmlFor="glm-key">GLM API Key (Z.AI)</Label>
                    {hasGlmKey && (
                      <span className="flex items-center text-sm text-green-600">
                        <Check className="h-3 w-3 mr-1" />
                        Configured
                      </span>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Input
                        id="glm-key"
                        type={showKeys ? "text" : "password"}
                        placeholder="Enter your GLM API key"
                        value={localKeys.glm || (showKeys ? glmKey || "" : "••••••••••••••••")}
                        onChange={(e) => setLocalKeys({ ...localKeys, glm: e.target.value })}
                      />
                    </div>
                    <Button
                      onClick={() => handleSaveKey("glm_api_key", localKeys.glm)}
                      disabled={!localKeys.glm || setSetting.isPending}
                    >
                      {setSetting.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        "Save"
                      )}
                    </Button>
                    {hasGlmKey && (
                      <Button
                        variant="destructive"
                        size="icon"
                        onClick={() => handleDeleteKey("glm_api_key")}
                        disabled={deleteSetting.isPending}
                        title="Delete key"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                  <p className="text-xs text-zinc-500 mt-1">
                    Get your key at{" "}
                    <a
                      href="https://open.bigmodel.cn/usercenter/apikeys"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline"
                    >
                      open.bigmodel.cn
                    </a>
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Privacy Notice</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-zinc-600 dark:text-zinc-400">
                  Your API keys are stored locally in your browser&apos;s database and are never sent to any server other than the respective API provider (Anthropic, Google, or Z.AI). Biblio is a local-first application.
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Data & Backup Tab */}
          <TabsContent value="data" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Data & Backup</CardTitle>
                <CardDescription>
                  Export your catalog or import from a backup
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-wrap gap-3">
                  <Button variant="outline" onClick={() => window.location.href = "/api/trpc/books.export?input=%7B%22format%22%3A%22csv%22%7D"}>
                    <Key className="mr-2 h-4 w-4" />
                    Export as CSV
                  </Button>
                  <Button variant="outline" onClick={() => window.location.href = "/api/trpc/books.export?input=%7B%22format%22%3A%22json%22%7D"}>
                    <Key className="mr-2 h-4 w-4" />
                    Export as JSON
                  </Button>
                </div>
                <p className="text-sm text-zinc-500">
                  Import functionality coming soon
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          {/* About Tab */}
          <TabsContent value="about" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>About Biblio</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <p className="text-sm">
                  <strong>Biblio v0.1.0</strong>
                </p>
                <p className="text-sm text-zinc-600 dark:text-zinc-400">
                  Pre-Phase 1: Foundation
                </p>
                <p className="text-sm text-zinc-600 dark:text-zinc-400">
                  AI-powered personal library management with conceptual blending and paired reading capabilities.
                </p>
                <hr className="border-zinc-200 dark:border-zinc-800 my-4" />
                <p className="text-sm text-zinc-600 dark:text-zinc-400">
                  All data stored locally in your browser.
                </p>
                <p className="text-sm text-zinc-600 dark:text-zinc-400">
                  Built with Next.js, tRPC, Drizzle ORM, and shadcn/ui.
                </p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
