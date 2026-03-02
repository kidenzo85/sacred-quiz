import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Music, Save, Play } from "lucide-react";
import { playTickSound, playCorrectSound, playWrongSound, playTimeUpSound } from "@/lib/sounds";

interface SoundSettings {
  tick_enabled: boolean;
  effects_enabled: boolean;
}

export function SoundConfig() {
  const [settings, setSettings] = useState<SoundSettings>({
    tick_enabled: true,
    effects_enabled: true,
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    supabase.from("admin_settings").select("value").eq("key", "sound_config").single()
      .then(({ data }) => { if (data?.value) setSettings(data.value as unknown as SoundSettings); });
  }, []);

  const save = async () => {
    setSaving(true);
    const { error } = await supabase.from("admin_settings").update({ value: settings as any }).eq("key", "sound_config");
    setSaving(false);
    if (error) toast.error("Erreur"); else toast.success("Configuration sauvegardée");
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-display flex items-center gap-2"><Music className="w-5 h-5 text-primary" /> Effets sonores</CardTitle>
        <CardDescription>Configurez les sons du jeu</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <Label>Son du compte à rebours</Label>
            <p className="text-xs text-muted-foreground">Tick-tock réaliste pendant le timer</p>
          </div>
          <Switch checked={settings.tick_enabled} onCheckedChange={(v) => setSettings({ ...settings, tick_enabled: v })} />
        </div>

        <div className="flex items-center justify-between">
          <div>
            <Label>Effets sonores</Label>
            <p className="text-xs text-muted-foreground">Sons de bonne/mauvaise réponse et temps écoulé</p>
          </div>
          <Switch checked={settings.effects_enabled} onCheckedChange={(v) => setSettings({ ...settings, effects_enabled: v })} />
        </div>

        <div className="space-y-2">
          <Label>Tester les sons</Label>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={() => playTickSound(false)}><Play className="w-3 h-3 mr-1" /> Tick</Button>
            <Button variant="outline" size="sm" onClick={() => playTickSound(true)}><Play className="w-3 h-3 mr-1" /> Tick (urgent)</Button>
            <Button variant="outline" size="sm" onClick={() => playCorrectSound()}><Play className="w-3 h-3 mr-1" /> Correct</Button>
            <Button variant="outline" size="sm" onClick={() => playWrongSound()}><Play className="w-3 h-3 mr-1" /> Incorrect</Button>
            <Button variant="outline" size="sm" onClick={() => playTimeUpSound()}><Play className="w-3 h-3 mr-1" /> Temps écoulé</Button>
          </div>
        </div>

        <Button onClick={save} disabled={saving}>
          <Save className="w-4 h-4 mr-2" />{saving ? "Sauvegarde..." : "Sauvegarder"}
        </Button>
      </CardContent>
    </Card>
  );
}
