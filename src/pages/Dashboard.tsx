import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { KpiCard } from "@/components/dashboard/KpiCard";
import { Package, AlertTriangle, TrendingUp, TrendingDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

export default function Dashboard() {
  const [stats, setStats] = useState({
    totalProducts: 0,
    lowStockItems: 0,
    totalStock: 0,
    warehouses: 0,
  });
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      // Fetch products count
      const { count: productsCount } = await supabase
        .from("products")
        .select("*", { count: "exact", head: true });

      // Fetch warehouses count
      const { count: warehousesCount } = await supabase
        .from("warehouses")
        .select("*", { count: "exact", head: true });

      // Fetch stock data
      const { data: stockData } = await supabase
        .from("stock")
        .select("quantity, product:products(reorder_level)");

      let totalStockQty = 0;
      let lowStockCount = 0;

      stockData?.forEach((item) => {
        totalStockQty += Number(item.quantity);
        const product = item.product as any;
        if (product && Number(item.quantity) <= Number(product.reorder_level)) {
          lowStockCount++;
        }
      });

      setStats({
        totalProducts: productsCount || 0,
        lowStockItems: lowStockCount,
        totalStock: Math.round(totalStockQty),
        warehouses: warehousesCount || 0,
      });
    } catch (error) {
      console.error("Error fetching stats:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">Welcome to StockMaster inventory management</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          title="Total Products"
          value={stats.totalProducts}
          icon={Package}
          description="Active products in catalog"
          variant="default"
        />
        <KpiCard
          title="Low Stock Items"
          value={stats.lowStockItems}
          icon={AlertTriangle}
          description="Below reorder level"
          variant={stats.lowStockItems > 0 ? "warning" : "success"}
        />
        <KpiCard
          title="Total Stock Units"
          value={stats.totalStock}
          icon={TrendingUp}
          description="Across all warehouses"
          variant="success"
        />
        <KpiCard
          title="Warehouses"
          value={stats.warehouses}
          icon={TrendingDown}
          description="Active locations"
          variant="default"
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Button onClick={() => navigate("/products/new")} size="lg" className="h-24">
          <Package className="mr-2 h-5 w-5" />
          Add New Product
        </Button>
        <Button onClick={() => navigate("/warehouses")} variant="outline" size="lg" className="h-24">
          Create Warehouse
        </Button>
        <Button onClick={() => navigate("/stock")} variant="outline" size="lg" className="h-24">
          View Stock
        </Button>
      </div>
    </div>
  );
}
