"use client";

import { UploadCloud } from "lucide-react";
import { useRef, useState } from "react";

import { useAuth } from "@/components/providers/AuthProvider";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

type UploadStatus = "idle" | "uploading" | "processing" | "success" | "error";

const apiBaseUrl = "/api/backend";

const supportedExtensions = [".jpg", ".jpeg", ".png", ".pdf"];

type OcrPayload = {
  text: string;
  fileUrl: string;
  filePath: string;
  fileName: string;
  ocrConfidence?: number;
};

type UploadBillCardProps = {
  onOcrComplete?: (payload: OcrPayload) => void;
  showPreview?: boolean;
};

export function UploadBillCard({
  onOcrComplete,
  showPreview = true
}: UploadBillCardProps) {
  const { session } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<UploadStatus>("idle");
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [ocrText, setOcrText] = useState("");
  const [fileName, setFileName] = useState<string | null>(null);
  const [fileUrl, setFileUrl] = useState<string | null>(null);

  const openFilePicker = () => {
    fileInputRef.current?.click();
  };

  const resetState = () => {
    setProgress(0);
    setError(null);
    setOcrText("");
    setFileUrl(null);
  };

  const uploadFile = (file: File) => {
    if (!session?.access_token) {
      setError("Please sign in before uploading.");
      return;
    }

    const extension = `.${file.name.split(".").pop()}`.toLowerCase();
    if (!supportedExtensions.includes(extension)) {
      setError("Unsupported format. Use JPG, PNG, or PDF.");
      return;
    }

    resetState();
    setFileName(file.name);
    setStatus("uploading");

    const formData = new FormData();
    formData.append("file", file);

    const xhr = new XMLHttpRequest();
    xhr.open("POST", `${apiBaseUrl}/api/bills/upload`);
    xhr.setRequestHeader("Authorization", `Bearer ${session.access_token}`);

    xhr.upload.onprogress = (event) => {
      if (!event.lengthComputable) return;
      const percent = Math.round((event.loaded / event.total) * 100);
      setProgress(percent);
    };

    xhr.upload.onload = () => {
      setStatus("processing");
    };

    xhr.onerror = () => {
      setStatus("error");
      setError("Upload failed. Please try again.");
    };

    xhr.onload = () => {
      if (xhr.status < 200 || xhr.status >= 300) {
        setStatus("error");
        setError(xhr.responseText || "Upload failed.");
        return;
      }

      try {
        const payload = JSON.parse(xhr.responseText) as {
          success: boolean;
          text?: string;
          error?: string;
          file_url?: string;
          file_path?: string;
          ocr_confidence?: number;
        };

        if (!payload.success) {
          setStatus("error");
          setError(payload.error ?? "OCR failed.");
          return;
        }

        const nextText = payload.text ?? "";
        const nextFileUrl = payload.file_url ?? "";
        const nextFilePath = payload.file_path ?? "";

        setStatus("success");
        setOcrText(nextText);
        setFileUrl(nextFileUrl || null);

        if (onOcrComplete) {
          onOcrComplete({
            text: nextText,
            fileUrl: nextFileUrl,
            filePath: nextFilePath,
            fileName: file.name,
            ocrConfidence: payload.ocr_confidence
          });
        }
      } catch (err) {
        setStatus("error");
        setError("Unexpected response from OCR service.");
      }
    };

    xhr.send(formData);
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    uploadFile(file);
  };

  return (
    <Card className="border-dashed">
      <CardContent className="flex flex-col gap-4 py-8">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/15 text-primary">
            <UploadCloud className="h-6 w-6" />
          </div>
          <div className="space-y-1">
            <div className="text-sm font-semibold">Upload latest bill</div>
            <div className="text-xs text-muted">
              Supported: JPG, PNG, PDF. OCR runs after upload.
            </div>
          </div>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept=".jpg,.jpeg,.png,.pdf"
          onChange={handleFileChange}
          className="hidden"
        />

        <div className="flex flex-wrap items-center gap-3">
          <Button size="sm" onClick={openFilePicker}>
            Choose file
          </Button>
          {fileName ? (
            <span className="text-xs text-muted">{fileName}</span>
          ) : null}
          {status === "processing" ? (
            <span className="text-xs text-muted">Processing OCR...</span>
          ) : null}
        </div>

        {status === "uploading" || progress > 0 ? (
          <div className="space-y-2">
            <div className="h-2 w-full rounded-full bg-background">
              <div
                className="h-2 rounded-full bg-primary transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
            <div className="text-xs text-muted">{progress}% uploaded</div>
          </div>
        ) : null}

        {error ? (
          <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-200">
            {error}
          </div>
        ) : null}

        {showPreview && ocrText ? (
          <div className="space-y-2">
            <div className="text-xs font-semibold text-muted">
              Extracted raw text
            </div>
            <pre className="max-h-44 overflow-y-auto rounded-lg border border-border bg-background p-3 text-xs text-muted">
              {ocrText}
            </pre>
            {fileUrl ? (
              <div className="text-xs text-muted">Stored in Supabase Storage.</div>
            ) : null}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
