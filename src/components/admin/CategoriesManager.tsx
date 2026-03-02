import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { BookOpen, Plus, Trash2, GripVertical } from "lucide-react";

interface Category {
  id: string;
  name: string;
  description: string | null;
  icon: string | null;
  display_order: number;
  is_active: boolean;
}

export function CategoriesManager() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newIcon, setNewIcon] = useState("📖");

  const load = async () => {
    const { data } = await supabase.from("categories").select("*").order("display_order");
    if (data) setCategories(data as Category[]);
  };

  useEffect(() => { load(); }, []);

  const addCategory = async () => {
    if (!newName.trim()) return;
    const maxOrder = categories.reduce((m, c) => Math.max(m, c.display_order), 0);
    const { error } = await supabase.from("categories").insert({
      name: newName.trim(),
      description: newDesc.trim() || null,
      icon: newIcon,
      display_order: maxOrder + 1,
    });
    if (error) toast.error("Erreur: " + error.message);
    else { toast.success("Catégorie ajoutée"); setNewName(""); setNewDesc(""); load(); }
  };

  const toggleActive = async (id: string, active: boolean) => {
    await supabase.from("categories").update({ is_active: active }).eq("id", id);
    load();
  };

  const deleteCategory = async (id: string) => {
    if (!confirm("Supprimer cette catégorie ?")) return;
    await supabase.from("categories").delete().eq("id", id);
    toast.success("Catégorie supprimée");
    load();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-display flex items-center gap-2"><BookOpen className="w-5 h-5 text-primary" /> Catégories bibliques</CardTitle>
        <CardDescription>Gérez les thèmes disponibles pour les quiz</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Add new */}
        <div className="flex gap-2 items-end">
          <div className="w-16">
            <Input value={newIcon} onChange={(e) => setNewIcon(e.target.value)} placeholder="📖" className="text-center text-lg" />
          </div>
          <div className="flex-1">
            <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Nom de la catégorie" />
          </div>
          <div className="flex-1">
            <Input value={newDesc} onChange={(e) => setNewDesc(e.target.value)} placeholder="Description (optionnel)" />
          </div>
          <Button onClick={addCategory} size="sm"><Plus className="w-4 h-4 mr-1" /> Ajouter</Button>
        </div>

        {/* List */}
        <div className="space-y-2">
          {categories.map((cat) => (
            <div key={cat.id} className="flex items-center gap-3 p-3 rounded-lg border border-border bg-card hover:bg-muted/30 transition-colors">
              <GripVertical className="w-4 h-4 text-muted-foreground cursor-grab" />
              <span className="text-lg">{cat.icon}</span>
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm">{cat.name}</div>
                {cat.description && <div className="text-xs text-muted-foreground truncate">{cat.description}</div>}
              </div>
              <Badge variant={cat.is_active ? "default" : "secondary"} className="text-xs">
                {cat.is_active ? "Active" : "Inactive"}
              </Badge>
              <Switch checked={cat.is_active} onCheckedChange={(v) => toggleActive(cat.id, v)} />
              <Button variant="ghost" size="icon" onClick={() => deleteCategory(cat.id)} className="text-destructive hover:text-destructive">
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
