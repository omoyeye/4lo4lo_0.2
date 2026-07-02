import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { GraduationCap, PlayCircle, CheckCircle, BookOpen, Coins, ChevronDown, ChevronUp, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import Sidebar from "@/components/layout/Sidebar";
import Footer from "@/components/layout/Footer";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";

type ClassroomVideoWithStatus = {
  id: number;
  title: string;
  description: string;
  videoUrl: string;
  thumbnailUrl: string | null;
  transcript: string;
  pointsReward: number;
  isPublished: boolean;
  displayOrder: number;
  createdAt: string;
  completed: boolean;
};

function getEmbedUrl(url: string): string {
  try {
    if (url.includes("youtube.com/watch")) {
      const u = new URL(url);
      const v = u.searchParams.get("v");
      return v ? `https://www.youtube.com/embed/${v}` : url;
    }
    if (url.includes("youtu.be/")) {
      const v = url.split("youtu.be/")[1]?.split("?")[0];
      return v ? `https://www.youtube.com/embed/${v}` : url;
    }
    if (url.includes("vimeo.com/")) {
      const v = url.split("vimeo.com/")[1]?.split("?")[0];
      return v ? `https://player.vimeo.com/video/${v}` : url;
    }
    return url;
  } catch {
    return url;
  }
}

function isDirectVideo(url: string): boolean {
  return /\.(mp4|webm|ogg)(\?|$)/i.test(url);
}

function VideoPlayer({ url }: { url: string }) {
  const embed = getEmbedUrl(url);
  if (isDirectVideo(url)) {
    return (
      <video controls className="w-full rounded-lg aspect-video bg-black" src={url}>
        Your browser does not support the video tag.
      </video>
    );
  }
  return (
    <iframe
      src={embed}
      className="w-full rounded-lg aspect-video"
      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
      allowFullScreen
      title="Classroom video"
    />
  );
}

function VideoCard({ video, onSelect }: { video: ClassroomVideoWithStatus; onSelect: (v: ClassroomVideoWithStatus) => void }) {
  return (
    <Card
      className="cursor-pointer hover:shadow-md hover:scale-[1.01] transition-all border overflow-hidden group"
      onClick={() => onSelect(video)}
    >
      <div className="relative aspect-video bg-muted flex items-center justify-center overflow-hidden">
        {video.thumbnailUrl ? (
          <img src={video.thumbnailUrl} alt={video.title} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-primary/20 to-purple-600/20 flex items-center justify-center">
            <PlayCircle className="w-12 h-12 text-primary/60" />
          </div>
        )}
        {video.completed && (
          <div className="absolute top-2 right-2">
            <Badge className="bg-green-500 text-white gap-1">
              <CheckCircle className="w-3 h-3" /> Done
            </Badge>
          </div>
        )}
      </div>
      <CardContent className="p-4">
        <h3 className="font-semibold text-base line-clamp-2 group-hover:text-primary transition-colors">{video.title}</h3>
        {video.description && (
          <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{video.description}</p>
        )}
        <div className="flex items-center justify-between mt-3">
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <Coins className="w-3 h-3 text-primary" />
            <span className="font-medium text-primary">{video.pointsReward} pts</span>
          </span>
          {video.completed ? (
            <span className="text-xs text-green-600 font-medium flex items-center gap-1">
              <CheckCircle className="w-3 h-3" /> Completed
            </span>
          ) : (
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <PlayCircle className="w-3 h-3" /> Watch to earn
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function VideoDetail({ video, onBack }: { video: ClassroomVideoWithStatus; onBack: () => void }) {
  const { toast } = useToast();
  const { user } = useAuth();
  const [transcriptOpen, setTranscriptOpen] = useState(true);

  const completeMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/classroom/videos/${video.id}/complete`, {});
      return res.json();
    },
    onSuccess: (data) => {
      if (data.pointsEarned > 0) {
        toast({ title: "Lesson Complete!", description: `You earned ${data.pointsEarned} points. Keep learning!` });
      } else {
        toast({ title: "Already Completed", description: "You've already earned points for this lesson." });
      }
      queryClient.invalidateQueries({ queryKey: ["/api/classroom/videos"] });
    },
    onError: () => {
      toast({ title: "Error", description: "Could not mark as complete. Please try again.", variant: "destructive" });
    }
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-2">
        <Button variant="ghost" size="sm" onClick={onBack} className="gap-2">
          <ChevronDown className="w-4 h-4 rotate-90" /> Back to Classroom
        </Button>
      </div>

      <div>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div>
            <h2 className="text-xl md:text-2xl font-bold">{video.title}</h2>
            {video.description && (
              <p className="text-muted-foreground mt-1 text-sm">{video.description}</p>
            )}
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <Badge variant="outline" className="gap-1">
              <Coins className="w-3 h-3 text-primary" /> {video.pointsReward} pts
            </Badge>
            {video.completed ? (
              <Badge className="bg-green-500 text-white gap-1">
                <CheckCircle className="w-3 h-3" /> Completed
              </Badge>
            ) : (
              <Button
                size="sm"
                onClick={() => completeMutation.mutate()}
                disabled={completeMutation.isPending}
                className="gap-2"
              >
                {completeMutation.isPending ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</>
                ) : (
                  <><CheckCircle className="w-4 h-4" /> Mark as Complete</>
                )}
              </Button>
            )}
          </div>
        </div>

        <VideoPlayer url={video.videoUrl} />
      </div>

      {video.transcript && (
        <Card>
          <CardHeader
            className="cursor-pointer p-4 flex flex-row items-center justify-between"
            onClick={() => setTranscriptOpen(v => !v)}
          >
            <div className="flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-primary" />
              <CardTitle className="text-base">Transcript</CardTitle>
            </div>
            {transcriptOpen ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
          </CardHeader>
          {transcriptOpen && (
            <CardContent className="p-4 pt-0">
              <div className="max-h-80 overflow-y-auto rounded bg-muted/40 p-4 text-sm leading-relaxed whitespace-pre-wrap">
                {video.transcript}
              </div>
            </CardContent>
          )}
        </Card>
      )}

      {!video.completed && (
        <div className="flex justify-center pt-2">
          <Button
            size="lg"
            onClick={() => completeMutation.mutate()}
            disabled={completeMutation.isPending}
            className="gap-2 w-full sm:w-auto"
          >
            {completeMutation.isPending ? (
              <><Loader2 className="w-5 h-5 animate-spin" /> Saving...</>
            ) : (
              <><CheckCircle className="w-5 h-5" /> Mark as Complete & Earn {video.pointsReward} Points</>
            )}
          </Button>
        </div>
      )}
    </div>
  );
}

export default function Classroom() {
  const { user } = useAuth();
  const [selectedVideo, setSelectedVideo] = useState<ClassroomVideoWithStatus | null>(null);

  const { data: videos = [], isLoading } = useQuery<ClassroomVideoWithStatus[]>({
    queryKey: ["/api/classroom/videos"],
    enabled: !!user,
  });

  const completedCount = videos.filter(v => v.completed).length;
  const totalPoints = videos.filter(v => v.completed).reduce((sum, v) => sum + v.pointsReward, 0);

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-background">
      <Sidebar />
      <div className="flex-1 flex flex-col pb-20 md:pb-0">
        <div className="flex-1">
          <div className="container mx-auto py-4 md:py-6 px-4 md:px-6 max-w-6xl">
            {selectedVideo ? (
              <VideoDetail
                video={selectedVideo}
                onBack={() => setSelectedVideo(null)}
              />
            ) : (
              <>
                <div className="mb-6 md:mb-8">
                  <div className="flex items-center gap-3 mb-2">
                    <GraduationCap className="w-7 h-7 text-primary" />
                    <h1 className="text-2xl md:text-3xl font-bold">Classroom</h1>
                  </div>
                  <p className="text-sm md:text-base text-muted-foreground max-w-2xl">
                    Learn from our video library, read transcripts, and earn points for every lesson you complete. Knowledge is your superpower.
                  </p>
                </div>

                {/* Stats bar */}
                {!isLoading && videos.length > 0 && (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
                    <Card className="p-3 flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <GraduationCap className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Progress</p>
                        <p className="font-bold text-sm">{completedCount}/{videos.length} lessons</p>
                      </div>
                    </Card>
                    <Card className="p-3 flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-green-500/10 flex items-center justify-center flex-shrink-0">
                        <Coins className="w-5 h-5 text-green-500" />
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Points Earned</p>
                        <p className="font-bold text-sm">{totalPoints} pts</p>
                      </div>
                    </Card>
                    <Card className="p-3 flex items-center gap-3 col-span-2 sm:col-span-1">
                      <div className="w-9 h-9 rounded-full bg-purple-500/10 flex items-center justify-center flex-shrink-0">
                        <CheckCircle className="w-5 h-5 text-purple-500" />
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Completion</p>
                        <p className="font-bold text-sm">
                          {videos.length > 0 ? Math.round((completedCount / videos.length) * 100) : 0}%
                        </p>
                      </div>
                    </Card>
                  </div>
                )}

                {isLoading ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {Array(6).fill(null).map((_, i) => (
                      <Card key={i} className="overflow-hidden">
                        <Skeleton className="aspect-video w-full" />
                        <CardContent className="p-4 space-y-2">
                          <Skeleton className="h-4 w-3/4" />
                          <Skeleton className="h-3 w-full" />
                          <Skeleton className="h-3 w-1/2" />
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : videos.length === 0 ? (
                  <div className="text-center py-16 space-y-3">
                    <GraduationCap className="w-12 h-12 text-muted-foreground/40 mx-auto" />
                    <h3 className="text-lg font-medium text-muted-foreground">No lessons yet</h3>
                    <p className="text-sm text-muted-foreground">Check back soon, new learning content is being added.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {videos.map(video => (
                      <VideoCard key={video.id} video={video} onSelect={setSelectedVideo} />
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
        <Footer />
      </div>
    </div>
  );
}
