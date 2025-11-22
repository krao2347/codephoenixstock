import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, Package, DollarSign, ShoppingCart, AlertTriangle } from "lucide-react";
import { formatCurrency } from "@/lib/currency";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

interface SalesTrend {
  month: string;
  revenue: number;
  orders: number;
}

interface BestSellingProduct {
  name: string;
  sku: string;
  quantity_sold: number;
  revenue: number;
  category: string;
}

interface StockMetrics {
  total_products: number;
  total_stock_value: number;
  low_stock_items: number;
  out_of_stock: number;
  average_turnover: number;
}

interface CategorySales {
  category: string;
  value: number;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82ca9d'];

export default function Analytics() {
  const [loading, setLoading] = useState(true);
  const [salesTrend, setSalesTrend] = useState<SalesTrend[]>([]);
  const [bestSelling, setBestSelling] = useState<BestSellingProduct[]>([]);
  const [stockMetrics, setStockMetrics] = useState<StockMetrics>({
    total_products: 0,
    total_stock_value: 0,
    low_stock_items: 0,
    out_of_stock: 0,
    average_turnover: 0,
  });
  const [categorySales, setCategorySales] = useState<CategorySales[]>([]);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    try {
      await Promise.all([
        fetchSalesTrend(),
        fetchBestSellingProducts(),
        fetchStockMetrics(),
        fetchCategorySales(),
      ]);
    } catch (error) {
      console.error("Error fetching analytics:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchSalesTrend = async () => {
    try {
      // Get sales orders from last 6 months
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

      const { data: orders, error } = await supabase
        .from("orders")
        .select(`
          id,
          order_date,
          order_items(quantity, unit_price)
        `)
        .eq("order_type", "sales")
        .gte("order_date", sixMonthsAgo.toISOString());

      if (error) throw error;

    if (orders) {
      // Group by month
      const monthlyData: { [key: string]: { revenue: number; orders: number } } = {};
      
      orders.forEach((order: any) => {
        const date = new Date(order.order_date);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        
        if (!monthlyData[monthKey]) {
          monthlyData[monthKey] = { revenue: 0, orders: 0 };
        }
        
        monthlyData[monthKey].orders += 1;
        
        if (order.order_items) {
          order.order_items.forEach((item: any) => {
            monthlyData[monthKey].revenue += Number(item.quantity) * Number(item.unit_price);
          });
        }
      });

      const trend = Object.entries(monthlyData)
        .map(([month, data]) => ({
          month: new Date(month + '-01').toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
          revenue: Math.round(data.revenue),
          orders: data.orders,
        }))
        .sort((a, b) => a.month.localeCompare(b.month));

      setSalesTrend(trend);
      }
    } catch (error) {
      console.error("Error fetching sales trend:", error);
      setSalesTrend([]);
    }
  };

  const fetchBestSellingProducts = async () => {
    try {
      const { data: orderItems, error } = await supabase
        .from("order_items")
        .select(`
          quantity,
          unit_price,
          product:products(id, name, sku, category)
        `);

      if (error) throw error;

    if (orderItems) {
      // Group by product
      const productSales: { [key: string]: BestSellingProduct } = {};
      
      orderItems.forEach((item: any) => {
        if (item.product) {
          const productId = item.product.id;
          
          if (!productSales[productId]) {
            productSales[productId] = {
              name: item.product.name,
              sku: item.product.sku,
              category: item.product.category || 'Uncategorized',
              quantity_sold: 0,
              revenue: 0,
            };
          }
          
          productSales[productId].quantity_sold += Number(item.quantity);
          productSales[productId].revenue += Number(item.quantity) * Number(item.unit_price);
        }
      });

      const topProducts = Object.values(productSales)
        .sort((a, b) => b.quantity_sold - a.quantity_sold)
        .slice(0, 10);

      setBestSelling(topProducts);
      }
    } catch (error) {
      console.error("Error fetching best selling products:", error);
      setBestSelling([]);
    }
  };

  const fetchStockMetrics = async () => {
    try {
      const { data: products, error } = await supabase
        .from("products")
        .select(`
          id,
          reorder_level,
          cost_price,
          stock(quantity)
        `);

      if (error) throw error;

    if (products) {
      let total_stock_value = 0;
      let low_stock_items = 0;
      let out_of_stock = 0;

      products.forEach((product: any) => {
        const totalQty = product.stock?.reduce((sum: number, s: any) => sum + Number(s.quantity), 0) || 0;
        total_stock_value += totalQty * Number(product.cost_price || 0);
        
        if (totalQty === 0) {
          out_of_stock += 1;
        } else if (totalQty <= product.reorder_level) {
          low_stock_items += 1;
        }
      });

      setStockMetrics({
        total_products: products.length,
        total_stock_value: Math.round(total_stock_value),
        low_stock_items,
        out_of_stock,
        average_turnover: 0,
      });
      }
    } catch (error) {
      console.error("Error fetching stock metrics:", error);
    }
  };

  const fetchCategorySales = async () => {
    try {
      const { data: orderItems, error } = await supabase
        .from("order_items")
        .select(`
          quantity,
          unit_price,
          product:products(category)
        `);

      if (error) throw error;

    if (orderItems) {
      const categoryTotals: { [key: string]: number } = {};
      
      orderItems.forEach((item: any) => {
        const category = item.product?.category || 'Uncategorized';
        const revenue = Number(item.quantity) * Number(item.unit_price);
        
        if (!categoryTotals[category]) {
          categoryTotals[category] = 0;
        }
        categoryTotals[category] += revenue;
      });

      const categoryData = Object.entries(categoryTotals)
        .map(([category, value]) => ({
          category,
          value: Math.round(value),
        }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 6);

      setCategorySales(categoryData);
      }
    } catch (error) {
      console.error("Error fetching category sales:", error);
      setCategorySales([]);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading analytics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="space-y-2">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
          Analytics Dashboard
        </h1>
        <p className="text-lg text-muted-foreground">Insights into your inventory performance</p>
      </div>

      {/* Key Metrics */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card className="hover-lift">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Products</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stockMetrics.total_products}</div>
            <p className="text-xs text-muted-foreground mt-1">Active in catalog</p>
          </CardContent>
        </Card>

        <Card className="hover-lift">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Stock Value</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stockMetrics.total_stock_value)}</div>
            <p className="text-xs text-muted-foreground mt-1">Total inventory cost</p>
          </CardContent>
        </Card>

        <Card className="hover-lift">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Low Stock Items</CardTitle>
            <AlertTriangle className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{stockMetrics.low_stock_items}</div>
            <p className="text-xs text-muted-foreground mt-1">Below reorder level</p>
          </CardContent>
        </Card>

        <Card className="hover-lift">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Out of Stock</CardTitle>
            <TrendingDown className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{stockMetrics.out_of_stock}</div>
            <p className="text-xs text-muted-foreground mt-1">Items depleted</p>
          </CardContent>
        </Card>
      </div>

      {/* Sales Trend Chart */}
      <Card className="hover-lift">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Sales Trend (Last 6 Months)
          </CardTitle>
          <CardDescription>Revenue and order count over time</CardDescription>
        </CardHeader>
        <CardContent>
          {salesTrend.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={salesTrend}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis yAxisId="left" />
                <YAxis yAxisId="right" orientation="right" />
                <Tooltip />
                <Legend />
                <Line yAxisId="left" type="monotone" dataKey="revenue" stroke="#8884d8" name="Revenue" strokeWidth={2} />
                <Line yAxisId="right" type="monotone" dataKey="orders" stroke="#82ca9d" name="Orders" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-64 text-muted-foreground">
              <div className="text-center">
                <ShoppingCart className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>No sales data available yet</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Best Selling Products */}
        <Card className="hover-lift">
          <CardHeader>
            <CardTitle>Best Selling Products</CardTitle>
            <CardDescription>Top 10 products by quantity sold</CardDescription>
          </CardHeader>
          <CardContent>
            {bestSelling.length > 0 ? (
              <div className="space-y-4">
                {bestSelling.map((product, index) => (
                  <div key={product.sku} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Badge variant="outline" className="w-8 h-8 flex items-center justify-center">
                        {index + 1}
                      </Badge>
                      <div>
                        <p className="font-semibold">{product.name}</p>
                        <p className="text-xs text-muted-foreground">{product.sku} • {product.category}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">{product.quantity_sold} units</p>
                      <p className="text-xs text-muted-foreground">{formatCurrency(product.revenue)}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex items-center justify-center h-64 text-muted-foreground">
                <div className="text-center">
                  <Package className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>No sales data available</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Category Sales Distribution */}
        <Card className="hover-lift">
          <CardHeader>
            <CardTitle>Sales by Category</CardTitle>
            <CardDescription>Revenue distribution across categories</CardDescription>
          </CardHeader>
          <CardContent>
            {categorySales.length > 0 ? (
              <>
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie
                      data={categorySales}
                      dataKey="value"
                      nameKey="category"
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      label
                    >
                      {categorySales.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
                <div className="mt-4 space-y-2">
                  {categorySales.map((cat, index) => (
                    <div key={cat.category} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: COLORS[index % COLORS.length] }}
                        />
                        <span>{cat.category}</span>
                      </div>
                      <span className="font-semibold">{formatCurrency(cat.value)}</span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="flex items-center justify-center h-64 text-muted-foreground">
                <div className="text-center">
                  <Package className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>No category data available</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
