import { useState, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import {
  Mail,
  Bell,
  Send,
  Eye,
  Upload,
  Image,
  FileText,
  Trash2,
  Users,
  AlertCircle,
  Check,
  X,
  Bold,
  Italic,
  Underline,
  List,
  ListOrdered,
  Link as LinkIcon,
  Code,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Heading1,
  Heading2,
  Heading3,
  Loader2,
  RefreshCcw
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface UploadedFile {
  url: string;
  filename: string;
  size: number;
  mimetype: string;
}

export default function EmailCenter() {
  const [subject, setSubject] = useState("");
  const [htmlContent, setHtmlContent] = useState("");
  const [textContent, setTextContent] = useState("");
  const [sendEmail, setSendEmail] = useState(true);
  const [sendNotification, setSendNotification] = useState(true);
  const [showPreview, setShowPreview] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { toast } = useToast();

  const { data: userCount, refetch: refetchUserCount } = useQuery<{
    total: number;
    verified: number;
    unverified: number;
  }>({
    queryKey: ["/api/admin/user-count"],
  });

  const sendMessageMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch("/api/admin/bulk-message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to send message");
      }
      return res.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Message Sent",
        description: data.message || "Your message has been sent successfully.",
      });
      setSubject("");
      setHtmlContent("");
      setTextContent("");
      setUploadedFiles([]);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/admin/upload", {
        method: "POST",
        credentials: "include",
        body: formData,
      });

      if (!res.ok) {
        throw new Error("Failed to upload file");
      }

      const data = await res.json();
      setUploadedFiles([...uploadedFiles, data]);

      if (file.type.startsWith("image/")) {
        const imgTag = `<img src="${data.url}" alt="${data.filename}" style="max-width: 100%; height: auto; margin: 10px 0;" />`;
        insertAtCursor(imgTag);
      }

      toast({
        title: "File Uploaded",
        description: `${data.filename} uploaded successfully`,
      });
    } catch (error) {
      toast({
        title: "Upload Failed",
        description: "Failed to upload file. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const insertAtCursor = (text: string) => {
    const textarea = textareaRef.current;
    if (!textarea) {
      setHtmlContent(htmlContent + text);
      return;
    }

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const newContent = htmlContent.substring(0, start) + text + htmlContent.substring(end);
    setHtmlContent(newContent);
  };

  const insertTag = (tag: string, style?: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = htmlContent.substring(start, end);
    
    let wrappedText;
    if (style) {
      wrappedText = `<${tag} style="${style}">${selectedText || "text"}</${tag}>`;
    } else {
      wrappedText = `<${tag}>${selectedText || "text"}</${tag}>`;
    }

    const newContent = htmlContent.substring(0, start) + wrappedText + htmlContent.substring(end);
    setHtmlContent(newContent);
  };

  const removeFile = (index: number) => {
    setUploadedFiles(uploadedFiles.filter((_, i) => i !== index));
  };

  const handleSendMessage = () => {
    if (!subject.trim()) {
      toast({
        title: "Subject Required",
        description: "Please enter a subject for your message.",
        variant: "destructive",
      });
      return;
    }

    if (!htmlContent.trim()) {
      toast({
        title: "Content Required",
        description: "Please enter content for your message.",
        variant: "destructive",
      });
      return;
    }

    if (!sendEmail && !sendNotification) {
      toast({
        title: "Delivery Method Required",
        description: "Please select at least one delivery method (Email or In-App).",
        variant: "destructive",
      });
      return;
    }

    sendMessageMutation.mutate({
      subject,
      htmlContent,
      textContent: textContent || htmlContent.replace(/<[^>]*>/g, ''),
      sendEmail,
      sendNotification,
    });
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Mail className="h-6 w-6 text-primary" />
            Email & Messaging Center
          </h2>
          <p className="text-muted-foreground mt-1">
            Send bulk emails and in-app notifications to all users
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetchUserCount()}>
          <RefreshCcw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-gradient-to-br from-blue-500/10 to-blue-600/5 border-blue-500/20">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-500/20 rounded-lg">
                <Users className="h-6 w-6 text-blue-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Users</p>
                <p className="text-2xl font-bold">{userCount?.total || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-500/10 to-green-600/5 border-green-500/20">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-green-500/20 rounded-lg">
                <Check className="h-6 w-6 text-green-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Verified Email</p>
                <p className="text-2xl font-bold">{userCount?.verified || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-amber-500/10 to-amber-600/5 border-amber-500/20">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-amber-500/20 rounded-lg">
                <AlertCircle className="h-6 w-6 text-amber-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Unverified</p>
                <p className="text-2xl font-bold">{userCount?.unverified || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Compose Message
            </CardTitle>
            <CardDescription>
              Write your message with HTML support. Use {"{{username}}"} to personalize.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="subject">Subject Line</Label>
              <Input
                id="subject"
                placeholder="Enter email subject..."
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Formatting Toolbar</Label>
              <div className="flex flex-wrap gap-1 p-2 bg-muted/50 rounded-lg border">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => insertTag("strong")}
                  title="Bold"
                >
                  <Bold className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => insertTag("em")}
                  title="Italic"
                >
                  <Italic className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => insertTag("u")}
                  title="Underline"
                >
                  <Underline className="h-4 w-4" />
                </Button>
                <Separator orientation="vertical" className="h-8" />
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => insertTag("h1")}
                  title="Heading 1"
                >
                  <Heading1 className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => insertTag("h2")}
                  title="Heading 2"
                >
                  <Heading2 className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => insertTag("h3")}
                  title="Heading 3"
                >
                  <Heading3 className="h-4 w-4" />
                </Button>
                <Separator orientation="vertical" className="h-8" />
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => insertTag("p", "text-align: left")}
                  title="Align Left"
                >
                  <AlignLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => insertTag("p", "text-align: center")}
                  title="Align Center"
                >
                  <AlignCenter className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => insertTag("p", "text-align: right")}
                  title="Align Right"
                >
                  <AlignRight className="h-4 w-4" />
                </Button>
                <Separator orientation="vertical" className="h-8" />
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => insertAtCursor('<ul>\n  <li>Item 1</li>\n  <li>Item 2</li>\n</ul>')}
                  title="Bullet List"
                >
                  <List className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => insertAtCursor('<ol>\n  <li>Item 1</li>\n  <li>Item 2</li>\n</ol>')}
                  title="Numbered List"
                >
                  <ListOrdered className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => insertAtCursor('<a href="https://4lo4lo.site" style="color: #667eea; text-decoration: underline;">Link Text</a>')}
                  title="Link"
                >
                  <LinkIcon className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => insertAtCursor('<code style="background: #f0f0f0; padding: 2px 6px; border-radius: 4px;">code</code>')}
                  title="Code"
                >
                  <Code className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="content">HTML Content</Label>
              <Textarea
                ref={textareaRef}
                id="content"
                placeholder="Write your message here... HTML is supported. Use {{username}} for personalization."
                value={htmlContent}
                onChange={(e) => setHtmlContent(e.target.value)}
                className="min-h-[300px] font-mono text-sm"
              />
            </div>

            <div className="space-y-2">
              <Label>Plain Text Version (Optional)</Label>
              <Textarea
                placeholder="Optional: Plain text version for email clients that don't support HTML..."
                value={textContent}
                onChange={(e) => setTextContent(e.target.value)}
                className="min-h-[100px]"
              />
            </div>

            <div className="space-y-2">
              <Label>Upload Files / Images</Label>
              <div className="flex gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,.pdf,.doc,.docx,.txt"
                  onChange={handleFileUpload}
                  className="hidden"
                  id="file-upload"
                />
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                >
                  {isUploading ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Upload className="h-4 w-4 mr-2" />
                  )}
                  {isUploading ? "Uploading..." : "Upload File"}
                </Button>
              </div>
              {uploadedFiles.length > 0 && (
                <div className="space-y-2 mt-2">
                  {uploadedFiles.map((file, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-2 bg-muted/50 rounded-lg"
                    >
                      <div className="flex items-center gap-2">
                        {file.mimetype.startsWith("image/") ? (
                          <Image className="h-4 w-4 text-blue-500" />
                        ) : (
                          <FileText className="h-4 w-4 text-amber-500" />
                        )}
                        <span className="text-sm truncate max-w-[200px]">{file.filename}</span>
                        <Badge variant="secondary" className="text-xs">
                          {formatBytes(file.size)}
                        </Badge>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => removeFile(index)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <Separator />

            <div className="space-y-4">
              <Label>Delivery Method</Label>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <Mail className="h-5 w-5 text-blue-500" />
                    <div>
                      <p className="font-medium">Email</p>
                      <p className="text-xs text-muted-foreground">
                        Send to {userCount?.verified || 0} verified users
                      </p>
                    </div>
                  </div>
                  <Switch checked={sendEmail} onCheckedChange={setSendEmail} />
                </div>

                <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <Bell className="h-5 w-5 text-purple-500" />
                    <div>
                      <p className="font-medium">In-App Notification</p>
                      <p className="text-xs text-muted-foreground">
                        Send to all {userCount?.total || 0} users
                      </p>
                    </div>
                  </div>
                  <Switch checked={sendNotification} onCheckedChange={setSendNotification} />
                </div>
              </div>
            </div>

            <div className="flex gap-2 pt-4">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setShowPreview(true)}
                disabled={!htmlContent}
              >
                <Eye className="h-4 w-4 mr-2" />
                Preview
              </Button>
              <Button
                className="flex-1"
                onClick={handleSendMessage}
                disabled={sendMessageMutation.isPending || (!sendEmail && !sendNotification)}
              >
                {sendMessageMutation.isPending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Send className="h-4 w-4 mr-2" />
                )}
                {sendMessageMutation.isPending ? "Sending..." : "Send Message"}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5" />
              Live Preview
            </CardTitle>
            <CardDescription>
              See how your message will look to recipients
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="border rounded-lg overflow-hidden bg-white">
              <div className="bg-gradient-to-r from-primary to-purple-600 p-4 text-center">
                <h3 className="text-2xl font-bold text-white">4LO4LO</h3>
              </div>
              <ScrollArea className="h-[500px]">
                <div className="p-6">
                  {subject && (
                    <h2 className="text-xl font-bold mb-4 text-gray-800">{subject}</h2>
                  )}
                  {htmlContent ? (
                    <div
                      className="prose prose-sm max-w-none text-gray-700"
                      dangerouslySetInnerHTML={{
                        __html: htmlContent.replace(/\{\{username\}\}/g, "John Doe"),
                      }}
                    />
                  ) : (
                    <div className="text-center text-muted-foreground py-20">
                      <FileText className="h-12 w-12 mx-auto opacity-30 mb-4" />
                      <p>Start typing to see a preview</p>
                    </div>
                  )}
                </div>
              </ScrollArea>
              <div className="bg-gray-800 p-4 text-center text-gray-400 text-xs">
                <p>© 2025 4LO4LO. All rights reserved.</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-auto">
          <DialogHeader>
            <DialogTitle>Message Preview</DialogTitle>
            <DialogDescription>
              This is how your message will appear to recipients
            </DialogDescription>
          </DialogHeader>
          <div className="border rounded-lg overflow-hidden bg-white">
            <div className="bg-gradient-to-r from-primary to-purple-600 p-6 text-center">
              <h3 className="text-3xl font-bold text-white">4LO4LO</h3>
            </div>
            <div className="p-8">
              {subject && (
                <h2 className="text-2xl font-bold mb-6 text-gray-800">{subject}</h2>
              )}
              <div
                className="prose max-w-none text-gray-700"
                dangerouslySetInnerHTML={{
                  __html: htmlContent.replace(/\{\{username\}\}/g, "John Doe"),
                }}
              />
            </div>
            <div className="bg-gray-800 p-6 text-center text-gray-400 text-sm">
              <p className="mb-2">© 2025 4LO4LO. All rights reserved.</p>
              <p>
                <a href="#" className="text-primary hover:underline">Visit our website</a>
                {" | "}
                <a href="#" className="text-primary hover:underline">Contact Support</a>
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
