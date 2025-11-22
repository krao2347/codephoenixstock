import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Package, AlertTriangle } from "lucide-react";

interface StockItem {
  id: string;
  quantity: number;
  available_quantity: number;
  reserved_quantity: number;
  product: {
    name: string;
    sku: string;
    reorder_level: number;
  };
  warehouse: {
    name: string;
    short_code: string;
  };
  location: {
    name: string;
  } | null;
}

export default function Stock() {
  const [stock, setStock] = useState<StockItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStock();
  }, []);

  const fetchStock = async () => {
    try {
      const { data, error } = await supabase
        .from("stock")
        .select(`
          id,
          quantity,
          available_quantity,
          reserved_quantity,
          product:products(name, sku, reorder_level),
          warehouse:warehouses(name, short_code),
          location:locations(name)
        `)
        .order("quantity", { ascending: true });

      if (error) throw error;
      setStock(data || []);
    } catch (error) {
      console.error("Error fetching stock:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading stock...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="space-y-1">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
          Stock Levels
        </h1>
        <p className="text-lg text-muted-foreground">View current stock across all warehouses</p>
      </div>

      {stock.length === 0 ? (
        <div className="text-center py-20 bg-gradient-to-br from-card via-card to-muted/20 rounded-xl border-2 border-dashed animate-scale-in">
          <Package className="h-16 w-16 mx-auto mb-4 text-muted-foreground/50" />
          <p className="text-xl text-muted-foreground">No stock records found</p>
          <p className="text-sm text-muted-foreground mt-2">Create a receipt to add stock</p>
        </div>
      ) : (
        <div className="rounded-xl border bg-card shadow-lg overflow-hidden animate-fade-in-up">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="font-semibold">SKU</TableHead>
                <TableHead className="font-semibold">Product</TableHead>
                <TableHead className="font-semibold">Warehouse</TableHead>
                <TableHead className="font-semibold">Location</TableHead>
                <TableHead className="text-right font-semibold">Quantity</TableHead>
                <TableHead className="text-right font-semibold">Available</TableHead>
                <TableHead className="text-right font-semibold">Reserved</TableHead>
                <TableHead className="font-semibold">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {stock.map((item) => {
                const product = item.product as any;
                const warehouse = item.warehouse as any;
                const location = item.location as any;
                const isLowStock = Number(item.quantity) <= Number(product?.reorder_level || 0);

                return (
                  <TableRow key={item.id} className="hover:bg-primary/5 transition-colors group">
                    <TableCell className="font-mono text-sm">{product?.sku}</TableCell>
                    <TableCell className="font-semibold group-hover:text-primary transition-colors">
                      {product?.name}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="hover-scale">
                          {warehouse?.short_code}
                        </Badge>
                        <span className="text-muted-foreground text-sm">{warehouse?.name}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-muted-foreground">{location?.name || "-"}</span>
                    </TableCell>
                    <TableCell className="text-right font-bold text-lg">{item.quantity}</TableCell>
                    <TableCell className="text-right font-semibold text-success">
                      {item.available_quantity}
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {item.reserved_quantity}
                    </TableCell>
                    <TableCell>
                      {isLowStock ? (
                        <Badge variant="destructive" className="animate-pulse">
                          <AlertTriangle className="mr-1 h-3 w-3" />
                          Low Stock
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="bg-success/10 text-success border-success hover-scale">
                          In Stock
                        </Badge>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
