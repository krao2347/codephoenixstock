import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Save } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface Product {
  id: string;
  name: string;
  sku: string;
  description: string;
  category: string;
  uom: string;
  reorder_level: number;
  cost_price: number;
  selling_price: number;
}

interface Stock {
  id: string;
  quantity: number;
  warehouse: { name: string };
  location: { name: string } | null;
}

export default function ProductDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [product, setProduct] = useState<Product | null>(null);
  const [stock, setStock] = useState<Stock[]>([]);

  useEffect(() => {
    if (id) {
      fetchProduct();
      fetchStock();
    }
  }, [id]);

  const fetchProduct = async () => {
    try {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("id", id)
        .single();

      if (error) throw error;
      setProduct(data);
    } catch (error) {
      console.error("Error fetching product:", error);
      toast({
        title: "Error",
        description: "Failed to load product",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchStock = async () => {
    try {
      const { data, error } = await supabase
        .from("stock")
        .select(`
          id,
          quantity,
          warehouse:warehouses(name),
          location:locations(name)
        `)
        .eq("product_id", id);

      if (error) throw error;
      setStock(data || []);
    } catch (error) {
      console.error("Error fetching stock:", error);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!product) return;

    setSaving(true);

    try {
      const { error } = await supabase
        .from("products")
        .update({
          name: product.name,
          sku: product.sku,
          description: product.description,
          category: product.category,
          uom: product.uom,
          reorder_level: product.reorder_level,
          cost_price: product.cost_price,
          selling_price: product.selling_price,
        })
        .eq("id", id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Product updated successfully",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update product",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading product...</p>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground mb-4">Product not found</p>
        <Button onClick={() => navigate("/products")}>Back to Products</Button>
      </div>
    );
  }

  const totalStock = stock.reduce((sum, s) => sum + Number(s.quantity), 0);

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/products")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold">{product.name}</h1>
          <p className="text-muted-foreground">SKU: {product.sku}</p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Product Information</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleUpdate} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Product Name</Label>
                <Input
                  id="name"
                  value={product.name}
                  onChange={(e) => setProduct({ ...product, name: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="sku">SKU</Label>
                <Input
                  id="sku"
                  value={product.sku}
                  onChange={(e) => setProduct({ ...product, sku: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={product.description || ""}
                  onChange={(e) => setProduct({ ...product, description: e.target.value })}
                />
              </div>

              <div className="grid gap-4 grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="category">Category</Label>
                  <Input
                    id="category"
                    value={product.category || ""}
                    onChange={(e) => setProduct({ ...product, category: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="uom">UOM</Label>
                  <Input
                    id="uom"
                    value={product.uom}
                    onChange={(e) => setProduct({ ...product, uom: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid gap-4 grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="reorder_level">Reorder Level</Label>
                  <Input
                    id="reorder_level"
                    type="number"
                    value={product.reorder_level}
                    onChange={(e) => setProduct({ ...product, reorder_level: Number(e.target.value) })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cost_price">Cost</Label>
                  <Input
                    id="cost_price"
                    type="number"
                    step="0.01"
                    value={product.cost_price}
                    onChange={(e) => setProduct({ ...product, cost_price: Number(e.target.value) })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="selling_price">Price</Label>
                  <Input
                    id="selling_price"
                    type="number"
                    step="0.01"
                    value={product.selling_price}
                    onChange={(e) => setProduct({ ...product, selling_price: Number(e.target.value) })}
                  />
                </div>
              </div>

              <Button type="submit" disabled={saving}>
                <Save className="mr-2 h-4 w-4" />
                {saving ? "Saving..." : "Save Changes"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Stock Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="mb-4">
              <div className="text-3xl font-bold">{totalStock}</div>
              <p className="text-sm text-muted-foreground">Total units in stock</p>
            </div>

            {stock.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Warehouse</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead className="text-right">Quantity</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stock.map((s) => (
                    <TableRow key={s.id}>
                      <TableCell>{(s.warehouse as any)?.name || "N/A"}</TableCell>
                      <TableCell>{(s.location as any)?.name || "-"}</TableCell>
                      <TableCell className="text-right font-medium">{s.quantity}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">No stock recorded</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
