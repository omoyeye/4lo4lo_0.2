import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Plus, Edit, Trash, GraduationCap, Eye, EyeOff, Loader2, CheckCircle, Clock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";

type ClassroomVideo = {
  id: number;
  title: string;
  description: string;
  videoUrl: string;
  thumbnailUrl: string | null;
  transcript: string;
  pointsReward: number;
  isPublished: boolean;
  displayOrder: number;
  scheduledPublishAt: string | null;
  createdAt: string;
};

type FormData = {
  title: string;
  description: string;
  videoUrl: string;
  thumbnailUrl: string;
  transcript: string;
  pointsReward: number;
  isPublished: boolean;
  displayOrder: number;
  scheduledPublishAt: string | null;
};

const emptyForm: FormData = {
  title: "",
  description: "",
  videoUrl: "",
  thumbnailUrl: "",
  transcript: "",
  pointsReward: 50,
  isPublished: false,
  displayOrder: 0,
  scheduledPublishAt: null,
};

export default function ClassroomManager() {
  const { toast } = useToast();
  const [formOpen, setFormOpen] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);
  const [editingVideo, setEditingVideo] = useState<ClassroomVideo | null>(null);
  const [formData, setFormData] = useState<FormData>(emptyForm);

  const { data: videos = [], isLoading } = useQuery<ClassroomVideo[]>({
    queryKey: ["/api/admin/classroom/videos"],
    queryFn: async () => {
      const res = await fetch("/api/admin/classroom/videos", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: FormData) => {
      const res = await apiRequest("POST", "/api/admin/classroom/videos", {
        ...data,
        thumbnailUrl: data.thumbnailUrl || null,
      });
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Video Created", description: "The lesson has been added to the classroom." });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/classroom/videos"] });
      setFormOpen(false);
      setFormData(emptyForm);
    },
    onError: () => toast({ title: "Error", description: "Failed to create video.", variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<FormData> }) => {
      const res = await apiRequest("PATCH", `/api/admin/classroom/videos/${id}`, {
        ...data,
        thumbnailUrl: data.thumbnailUrl || null,
      });
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Video Updated", description: "The lesson has been updated." });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/classroom/videos"] });
      setFormOpen(false);
      setEditingVideo(null);
      setFormData(emptyForm);
    },
    onError: () => toast({ title: "Error", description: "Failed to update video.", variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("DELETE", `/api/admin/classroom/videos/${id}`, {});
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Video Deleted", description: "The lesson has been removed." });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/classroom/videos"] });
      setDeleteConfirmId(null);
    },
    onError: () => toast({ title: "Error", description: "Failed to delete video.", variant: "destructive" }),
  });

  const togglePublish = (video: ClassroomVideo) => {
    updateMutation.mutate({ id: video.id, data: { isPublished: !video.isPublished } });
  };

  // Send only scheduledPublishAt: null so server can auto-set isPublished: true
  const publishNow = (video: ClassroomVideo) => {
    updateMutation.mutate({ id: video.id, data: { scheduledPublishAt: null } });
  };

  const openNew = () => {
    setEditingVideo(null);
    setFormData(emptyForm);
    setFormOpen(true);
  };

  const openEdit = (video: ClassroomVideo) => {
    setEditingVideo(video);
    setFormData({
      title: video.title,
      description: video.description,
      videoUrl: video.videoUrl,
      thumbnailUrl: video.thumbnailUrl || "",
      transcript: video.transcript,
      pointsReward: video.pointsReward,
      isPublished: video.isPublished,
      displayOrder: video.displayOrder,
      scheduledPublishAt: video.scheduledPublishAt || null,
    });
    setFormOpen(true);
  };

  const handleSubmit = () => {
    if (!formData.title.trim() || !formData.videoUrl.trim()) {
      toast({ title: "Validation Error", description: "Title and Video URL are required.", variant: "destructive" });
      return;
    }
    if (editingVideo) {
      updateMutation.mutate({ id: editingVideo.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <Card>
      <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <GraduationCap className="w-5 h-5 text-primary" />
          <CardTitle>Classroom Videos</CardTitle>
        </div>
        <Button onClick={openNew} size="sm" className="gap-2 w-full sm:w-auto">
          <Plus className="w-4 h-4" /> Add Video
        </Button>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : videos.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <GraduationCap className="w-10 h-10 mx-auto mb-2 opacity-40" />
            <p>No videos yet. Click "Add Video" to get started.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead className="hidden md:table-cell">Points</TableHead>
                  <TableHead className="hidden md:table-cell">Order</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {videos.map(video => (
                  <TableRow key={video.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium line-clamp-1">{video.title}</p>
                        <p className="text-xs text-muted-foreground line-clamp-1 hidden sm:block">{video.description}</p>
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">{video.pointsReward} pts</TableCell>
                    <TableCell className="hidden md:table-cell">{video.displayOrder}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2 flex-wrap">
                        <Switch
                          checked={video.isPublished}
                          onCheckedChange={() => togglePublish(video)}
                          disabled={updateMutation.isPending}
                        />
                        {video.scheduledPublishAt && !video.isPublished ? (
                          <Badge className="bg-orange-500/10 text-orange-600 border border-orange-500/20 gap-1 hidden sm:flex">
                            <Clock className="w-3 h-3" />
                            Scheduled: {new Date(video.scheduledPublishAt).toLocaleString()}
                          </Badge>
                        ) : (
                          <Badge variant={video.isPublished ? "default" : "secondary"} className="hidden sm:flex">
                            {video.isPublished ? "Published" : "Draft"}
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2 flex-wrap">
                        {video.scheduledPublishAt && !video.isPublished && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-orange-600 border-orange-500/40 hover:bg-orange-500/10"
                            onClick={() => publishNow(video)}
                            disabled={updateMutation.isPending}
                          >
                            Publish Now
                          </Button>
                        )}
                        <Button variant="ghost" size="icon" onClick={() => openEdit(video)}>
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="text-red-500 hover:text-red-600" onClick={() => setDeleteConfirmId(video.id)}>
                          <Trash className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>

      {/* Create / Edit Dialog */}
      <Dialog open={formOpen} onOpenChange={v => { if (!isPending) { setFormOpen(v); if (!v) { setEditingVideo(null); setFormData(emptyForm); } } }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingVideo ? "Edit Lesson" : "Add New Lesson"}</DialogTitle>
            <DialogDescription>
              {editingVideo ? "Update the lesson details below." : "Fill in the details for the new classroom lesson."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1">
              <label className="text-sm font-medium">Title <span className="text-red-500">*</span></label>
              <Input
                placeholder="Lesson title"
                value={formData.title}
                onChange={e => setFormData(f => ({ ...f, title: e.target.value }))}
              />
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium">Description</label>
              <Textarea
                placeholder="Brief description of what users will learn"
                value={formData.description}
                onChange={e => setFormData(f => ({ ...f, description: e.target.value }))}
                className="h-20"
              />
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium">Video URL <span className="text-red-500">*</span></label>
              <Input
                placeholder="https://www.youtube.com/watch?v=... or direct .mp4 URL"
                value={formData.videoUrl}
                onChange={e => setFormData(f => ({ ...f, videoUrl: e.target.value }))}
              />
              <p className="text-xs text-muted-foreground">Supports YouTube, Vimeo, or direct video URLs (.mp4, .webm)</p>
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium">Thumbnail URL</label>
              <Input
                placeholder="https://example.com/thumbnail.jpg (optional)"
                value={formData.thumbnailUrl}
                onChange={e => setFormData(f => ({ ...f, thumbnailUrl: e.target.value }))}
              />
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium">Transcript</label>
              <Textarea
                placeholder="Paste the full video transcript here for accessibility and learning..."
                value={formData.transcript}
                onChange={e => setFormData(f => ({ ...f, transcript: e.target.value }))}
                className="h-40"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-sm font-medium">Points Reward</label>
                <Input
                  type="number"
                  min={1}
                  value={formData.pointsReward}
                  onChange={e => setFormData(f => ({ ...f, pointsReward: parseInt(e.target.value) || 50 }))}
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">Display Order</label>
                <Input
                  type="number"
                  min={0}
                  value={formData.displayOrder}
                  onChange={e => setFormData(f => ({ ...f, displayOrder: parseInt(e.target.value) || 0 }))}
                />
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 border rounded-lg">
              <Switch
                checked={formData.isPublished}
                onCheckedChange={v => setFormData(f => ({ ...f, isPublished: v, scheduledPublishAt: v ? null : f.scheduledPublishAt }))}
              />
              <div>
                <p className="text-sm font-medium">{formData.isPublished ? "Published" : "Draft"}</p>
                <p className="text-xs text-muted-foreground">
                  {formData.isPublished ? "Visible to all users" : "Only visible to admins"}
                </p>
              </div>
            </div>

            {!formData.isPublished && (
              <div className="space-y-1">
                <label className="text-sm font-medium">Schedule Publish Date (optional)</label>
                <div className="flex items-center gap-2">
                  <Input
                    type="datetime-local"
                    className="flex-1"
                    value={formData.scheduledPublishAt ? formData.scheduledPublishAt.slice(0, 16) : ""}
                    onChange={e => {
                      const newDate = e.target.value ? new Date(e.target.value).toISOString() : null;
                      const wasScheduled = !!(editingVideo?.scheduledPublishAt);
                      const clearingSchedule = wasScheduled && !newDate;
                      setFormData(f => ({
                        ...f,
                        scheduledPublishAt: newDate,
                        // Clearing the schedule on a previously-scheduled video auto-publishes it
                        ...(clearingSchedule ? { isPublished: true } : {}),
                      }));
                    }}
                  />
                  {editingVideo && editingVideo.scheduledPublishAt && (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="text-orange-600 border-orange-500/40 hover:bg-orange-500/10 whitespace-nowrap"
                      disabled={isPending}
                      onClick={() => {
                        publishNow(editingVideo);
                        setFormOpen(false);
                        setEditingVideo(null);
                        setFormData(emptyForm);
                      }}
                    >
                      Publish Now
                    </Button>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  If set, video will auto-publish at this date/time. Leave blank to stay as draft.
                </p>
              </div>
            )}
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setFormOpen(false)} disabled={isPending}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={isPending} className="gap-2">
              {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
              {editingVideo ? "Save Changes" : "Create Lesson"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={deleteConfirmId !== null} onOpenChange={v => { if (!v) setDeleteConfirmId(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Lesson</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this lesson? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDeleteConfirmId(null)} disabled={deleteMutation.isPending}>Cancel</Button>
            <Button
              variant="destructive"
              onClick={() => deleteConfirmId && deleteMutation.mutate(deleteConfirmId)}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
