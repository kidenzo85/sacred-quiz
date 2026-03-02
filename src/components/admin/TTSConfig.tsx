import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Save, Volume2, Play } from "lucide-react";

const GOOGLE_VOICES = [
  { id: "fr-FR-Neural2-A", label: "Neural2-A (Féminine)" },
  { id: "fr-FR-Neural2-B", label: "Neural2-B (Masculine)" },
  { id: "fr-FR-Neural2-C", label: "Neural2-C (Féminine)" },
  { id: "fr-FR-Neural2-D", label: "Neural2-D (Masculine)" },
  { id: "fr-FR-Neural2-E", label: "Neural2-E (Féminine)" },
  { id: "fr-FR-Wavenet-A", label: "Wavenet-A (Féminine)" },
  { id: "fr-FR-Wavenet-B", label: "Wavenet-B (Masculine)" },
  { id: "fr-FR-Wavenet-C", label: "Wavenet-C (Féminine)" },
  { id: "fr-FR-Wavenet-D", label: "Wavenet-D (Masculine)" },
  { id: "fr-FR-Wavenet-E", label: "Wavenet-E (Féminine)" },
];

interface TTSSettings {
  provider: "browser" | "google";
  google_voice: string;
  speed: number;
  pitch: number;
}

export function TTSConfig() {
  const [settings, setSettings] = useState<TTSSettings>({
    provider: "browser",
    google_voice: "fr-FR-Neural2-A",
    speed: 1.0,
    pitch: 0,
  });
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    supabase
      .from("admin_settings")
      .select("value")
      .eq("key", "tts_config")
      .single()
      .then(({ data }) => {
        if (data?.value) setSettings(data.value as unknown as TTSSettings);
      });
  }, []);

  const save = async () => {
    setSaving(true);
    const { error } = await supabase
      .from("admin_settings")
      .update({ value: settings as any })
      .eq("key", "tts_config");
    setSaving(false);
    if (error) toast.error("Erreur de sauvegarde");
    else toast.success("Configuration TTS sauvegardée");
  };

  const testVoice = async () => {
    setTesting(true);
    try {
      if (settings.provider === "browser") {
        const u = new SpeechSynthesisUtterance("Bienvenue dans le quiz biblique !");
        u.lang = "fr-FR";
        u.rate = settings.speed;
        u.pitch = settings.pitch;
        window.speechSynthesis.speak(u);
      } else {
        const { data, error } = await supabase.functions.invoke("text-to-speech", {
          body: { text: "Bienvenue dans le quiz biblique !", voice: settings.google_voice, speed: settings.speed, pitch: settings.pitch },
        });
        if (error) throw error;
        if (data?.audioContent) {
          const audio = new Audio(`data:audio/mp3;base64,${data.audioContent}`);
          audio.play();
        }
      }
    } catch (e: any) {
      toast.error("Erreur de test: " + (e.message || "Erreur inconnue"));
    }
    setTesting(false);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-display flex items-center gap-2"><Volume2 className="w-5 h-5 text-primary" /> Configuration Voix TTS</CardTitle>
        <CardDescription>Configurez la synthèse vocale pour la lecture des questions</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <Label>Utiliser Google Cloud TTS</Label>
            <p className="text-xs text-muted-foreground">Voix neuronales haute qualité</p>
          </div>
          <Switch
            checked={settings.provider === "google"}
            onCheckedChange={(checked) => setSettings({ ...settings, provider: checked ? "google" : "browser" })}
          />
        </div>

        {settings.provider === "google" && (
          <div className="space-y-2">
            <Label>Voix Google</Label>
            <Select value={settings.google_voice} onValueChange={(v) => setSettings({ ...settings, google_voice: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {GOOGLE_VOICES.map((v) => (
                  <SelectItem key={v.id} value={v.id}>{v.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        <div className="space-y-2">
          <Label>Vitesse ({settings.speed.toFixed(1)}x)</Label>
          <Slider min={0.5} max={2} step={0.1} value={[settings.speed]} onValueChange={([v]) => setSettings({ ...settings, speed: v })} />
        </div>

        <div className="space-y-2">
          <Label>Hauteur ({settings.pitch})</Label>
          <Slider min={-10} max={10} step={1} value={[settings.pitch]} onValueChange={([v]) => setSettings({ ...settings, pitch: v })} />
        </div>

        <div className="flex gap-3">
          <Button onClick={save} disabled={saving}>
            <Save className="w-4 h-4 mr-2" />{saving ? "Sauvegarde..." : "Sauvegarder"}
          </Button>
          <Button variant="outline" onClick={testVoice} disabled={testing}>
            <Play className="w-4 h-4 mr-2" />{testing ? "Test..." : "Tester la voix"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
