import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft } from "lucide-react";
import { getCurrencySymbol } from "@/lib/currency";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Warehouse {
  id: string;
  name: string;
}

export default function ProductNew() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [formData, setFormData] = useState({
    name: "",
    sku: "",
    description: "",
    category: "",
    uom: "Units",
    reorder_level: 0,
    cost_price: 0,
    selling_price: 0,
    quantity: 0,
    warehouse_id: "",
  });

  useEffect(() => {
    fetchWarehouses();
  }, []);

  const fetchWarehouses = async () => {
    try {
      const { data, error } = await supabase
        .from("warehouses")
        .select("id, name")
        .order("name");

      if (error) throw error;
      setWarehouses(data || []);
    } catch (error) {
      console.error("Error fetching warehouses:", error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name || !formData.sku) {
      toast({
        title: "Error",
        description: "Name and SKU are required",
        variant: "destructive",
      });
      return;
    }

    if (!formData.warehouse_id) {
      toast({
        title: "Error",
        description: "Please select a warehouse for initial stock",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      // Create new product
      const { data: session } = await supabase.auth.getSession();
      
      const { data: newProduct, error: productError } = await supabase
        .from("products")
        .insert({
          name: formData.name,
          sku: formData.sku,
          description: formData.description,
          category: formData.category,
          uom: formData.uom,
          reorder_level: formData.reorder_level,
          cost_price: formData.cost_price,
          selling_price: formData.selling_price,
          created_by: session.session?.user.id,
        })
        .select()
        .single();

      if (productError) throw productError;

      // Create initial stock entry if quantity is specified
      if (formData.quantity > 0) {
        const { error: stockError } = await supabase.from("stock").insert({
          product_id: newProduct.id,
          warehouse_id: formData.warehouse_id,
          quantity: formData.quantity,
          reserved_quantity: 0,
          user_id: session.session?.user.id,
        });

        if (stockError) throw stockError;
      }

      toast({
        title: "Success",
        description: "Product created successfully",
      });
      navigate("/products");
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to create product",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8 max-w-3xl animate-fade-in">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/products")} className="hover-scale">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="space-y-1">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
            New Product
          </h1>
          <p className="text-lg text-muted-foreground">Add a new product to your catalog</p>
        </div>
      </div>

      <Card className="shadow-lg border-2 hover-lift">
        <CardHeader className="bg-muted/50">
          <CardTitle className="text-2xl">Product Information</CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-sm font-semibold">
                  Product Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Laptop Dell XPS 15"
                  disabled={loading}
                  className="h-11 transition-all focus:ring-2 focus:ring-primary/20"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="sku" className="text-sm font-semibold">
                  SKU <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="sku"
                  value={formData.sku}
                  onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                  placeholder="e.g., LAP-DELL-XPS15"
                  disabled={loading}
                  className="h-11 transition-all focus:ring-2 focus:ring-primary/20"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description" className="text-sm font-semibold">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Product description..."
                disabled={loading}
                rows={4}
                className="transition-all focus:ring-2 focus:ring-primary/20"
              />
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="category" className="text-sm font-semibold">Category</Label>
                <Input
                  id="category"
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  placeholder="e.g., Electronics"
                  disabled={loading}
                  className="h-11 transition-all focus:ring-2 focus:ring-primary/20"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="uom" className="text-sm font-semibold">Unit of Measure</Label>
                <Input
                  id="uom"
                  value={formData.uom}
                  onChange={(e) => setFormData({ ...formData, uom: e.target.value })}
                  placeholder="e.g., Units, Kg, Liters"
                  disabled={loading}
                  className="h-11 transition-all focus:ring-2 focus:ring-primary/20"
                />
              </div>
            </div>

            <div className="grid gap-6 md:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="reorder_level" className="text-sm font-semibold">Reorder Level</Label>
                <Input
                  id="reorder_level"
                  type="number"
                  value={formData.reorder_level}
                  onChange={(e) => setFormData({ ...formData, reorder_level: Number(e.target.value) })}
                  disabled={loading}
                  className="h-11 transition-all focus:ring-2 focus:ring-primary/20"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cost_price" className="text-sm font-semibold">Cost Price ({getCurrencySymbol()})</Label>
                <Input
                  id="cost_price"
                  type="number"
                  step="0.01"
                  value={formData.cost_price}
                  onChange={(e) => setFormData({ ...formData, cost_price: Number(e.target.value) })}
                  disabled={loading}
                  className="h-11 transition-all focus:ring-2 focus:ring-primary/20"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="selling_price" className="text-sm font-semibold">Selling Price ({getCurrencySymbol()})</Label>
                <Input
                  id="selling_price"
                  type="number"
                  step="0.01"
                  value={formData.selling_price}
                  onChange={(e) => setFormData({ ...formData, selling_price: Number(e.target.value) })}
                  disabled={loading}
                  className="h-11 transition-all focus:ring-2 focus:ring-primary/20"
                />
              </div>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="warehouse" className="text-sm font-semibold">
                  Warehouse <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={formData.warehouse_id}
                  onValueChange={(value) => setFormData({ ...formData, warehouse_id: value })}
                  disabled={loading}
                >
                  <SelectTrigger className="h-11 transition-all focus:ring-2 focus:ring-primary/20">
                    <SelectValue placeholder="Select warehouse" />
                  </SelectTrigger>
                  <SelectContent>
                    {warehouses.map((warehouse) => (
                      <SelectItem key={warehouse.id} value={warehouse.id}>
                        {warehouse.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="quantity" className="text-sm font-semibold">
                  Initial Quantity (Optional)
                </Label>
                <Input
                  id="quantity"
                  type="number"
                  value={formData.quantity}
                  onChange={(e) => setFormData({ ...formData, quantity: Number(e.target.value) })}
                  disabled={loading}
                  placeholder="0"
                  className="h-11 transition-all focus:ring-2 focus:ring-primary/20"
                />
                <p className="text-xs text-muted-foreground">
                  Add initial stock, or use Receipts to add inventory later
                </p>
              </div>
            </div>

            <div className="flex gap-4 pt-4">
              <Button type="submit" disabled={loading} size="lg" className="hover-lift">
                {loading ? (
                  <div className="flex items-center gap-2">
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
                    <span>Creating...</span>
                  </div>
                ) : "Create Product"}
              </Button>
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => navigate("/products")} 
                disabled={loading}
                size="lg"
                className="hover-lift"
              >
                Cancel
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
