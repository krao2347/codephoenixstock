import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Plus, Package, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency } from "@/lib/currency";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface Product {
  id: string;
  name: string;
  sku: string;
  category: string;
  uom: string;
  reorder_level: number;
  cost_price: number;
  selling_price: number;
  total_quantity?: number;
}

export default function Products() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      const { data, error } = await supabase
        .from("products")
        .select(`
          *,
          stock(quantity)
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      
      const productsWithQuantity = (data || []).map((product: any) => ({
        ...product,
        total_quantity: product.stock?.reduce((sum: number, s: any) => sum + Number(s.quantity || 0), 0) || 0,
      }));
      
      setProducts(productsWithQuantity);
    } catch (error) {
      console.error("Error fetching products:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteClick = (product: Product, e: React.MouseEvent) => {
    e.stopPropagation();
    setProductToDelete(product);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!productToDelete) return;

    try {
      // Check all foreign key dependencies
      const [orderItemsCheck, receiptItemsCheck, transferItemsCheck] = await Promise.all([
        supabase.from("order_items").select("id").eq("product_id", productToDelete.id).limit(1),
        supabase.from("receipt_items").select("id").eq("product_id", productToDelete.id).limit(1),
        supabase.from("transfer_items").select("id").eq("product_id", productToDelete.id).limit(1),
      ]);

      // Check for errors
      if (orderItemsCheck.error) throw orderItemsCheck.error;
      if (receiptItemsCheck.error) throw receiptItemsCheck.error;
      if (transferItemsCheck.error) throw transferItemsCheck.error;

      // Check if product is used anywhere
      if (orderItemsCheck.data && orderItemsCheck.data.length > 0) {
        toast({
          title: "Cannot Delete Product",
          description: "This product is used in orders and cannot be deleted.",
          variant: "destructive",
        });
        setDeleteDialogOpen(false);
        setProductToDelete(null);
        return;
      }

      if (receiptItemsCheck.data && receiptItemsCheck.data.length > 0) {
        toast({
          title: "Cannot Delete Product",
          description: "This product is used in receipts and cannot be deleted.",
          variant: "destructive",
        });
        setDeleteDialogOpen(false);
        setProductToDelete(null);
        return;
      }

      if (transferItemsCheck.data && transferItemsCheck.data.length > 0) {
        toast({
          title: "Cannot Delete Product",
          description: "This product is used in transfers and cannot be deleted.",
          variant: "destructive",
        });
        setDeleteDialogOpen(false);
        setProductToDelete(null);
        return;
      }

      // Delete stock entries first (these are safe to cascade)
      const { error: deleteStockError } = await supabase
        .from("stock")
        .delete()
        .eq("product_id", productToDelete.id);

      if (deleteStockError) throw deleteStockError;

      // Now delete the product
      const { error } = await supabase
        .from("products")
        .delete()
        .eq("id", productToDelete.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Product deleted successfully",
      });
      
      fetchProducts();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to delete product",
        variant: "destructive",
      });
    } finally {
      setDeleteDialogOpen(false);
      setProductToDelete(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading products...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
            Products
          </h1>
          <p className="text-lg text-muted-foreground">Manage your product catalog</p>
        </div>
        <Button onClick={() => navigate("/products/new")} size="lg" className="hover-lift group">
          <Plus className="mr-2 h-5 w-5 group-hover:rotate-90 transition-transform" />
          Add Product
        </Button>
      </div>

      {products.length === 0 ? (
        <div className="text-center py-20 bg-gradient-to-br from-card via-card to-muted/20 rounded-xl border-2 border-dashed animate-scale-in">
          <Package className="h-16 w-16 mx-auto mb-4 text-muted-foreground/50" />
          <p className="text-xl text-muted-foreground mb-6">No products found</p>
          <Button onClick={() => navigate("/products/new")} size="lg" className="hover-lift">
            <Plus className="mr-2 h-5 w-5" />
            Create your first product
          </Button>
        </div>
      ) : (
        <div className="rounded-xl border bg-card shadow-lg overflow-hidden animate-fade-in-up">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="font-semibold">SKU</TableHead>
                <TableHead className="font-semibold">Name</TableHead>
                <TableHead className="font-semibold">Category</TableHead>
                <TableHead className="font-semibold">UOM</TableHead>
                <TableHead className="font-semibold">Quantity</TableHead>
                <TableHead className="font-semibold">Reorder Level</TableHead>
                <TableHead className="font-semibold">Cost</TableHead>
                <TableHead className="font-semibold">Selling Price</TableHead>
                <TableHead className="font-semibold">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {products.map((product) => (
                <TableRow 
                  key={product.id} 
                  className="cursor-pointer hover:bg-primary/5 transition-colors group" 
                  onClick={() => navigate(`/products/${product.id}`)}
                >
                  <TableCell className="font-mono text-sm">{product.sku}</TableCell>
                  <TableCell className="font-semibold group-hover:text-primary transition-colors">
                    {product.name}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="hover-scale">
                      {product.category || "Uncategorized"}
                    </Badge>
                  </TableCell>
                  <TableCell><span className="text-muted-foreground">{product.uom}</span></TableCell>
                  <TableCell className="font-semibold">{product.total_quantity || 0}</TableCell>
                  <TableCell>{product.reorder_level}</TableCell>
                  <TableCell className="font-mono">{formatCurrency(product.cost_price)}</TableCell>
                  <TableCell className="font-mono font-semibold text-success">
                    {formatCurrency(product.selling_price)}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="hover:bg-primary/10 hover:text-primary"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/products/${product.id}`);
                        }}
                      >
                        View
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="hover:bg-destructive/10 hover:text-destructive"
                        onClick={(e) => handleDeleteClick(product, e)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Product</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{productToDelete?.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
