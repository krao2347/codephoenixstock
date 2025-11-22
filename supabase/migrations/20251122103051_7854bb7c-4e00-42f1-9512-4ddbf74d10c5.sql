-- Add user_id columns to tables that don't have them
ALTER TABLE public.warehouses ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id);
ALTER TABLE public.locations ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id);
ALTER TABLE public.stock ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id);

-- Set user_id for existing records (assign to the creator of related records where possible)
-- For warehouses, use the first admin user or null
UPDATE public.warehouses SET user_id = (
  SELECT id FROM auth.users LIMIT 1
) WHERE user_id IS NULL;

-- For locations, set user_id from their warehouse
UPDATE public.locations l SET user_id = w.user_id
FROM public.warehouses w
WHERE l.warehouse_id = w.id AND l.user_id IS NULL;

-- For stock, set user_id from the product creator
UPDATE public.stock s SET user_id = p.created_by
FROM public.products p
WHERE s.product_id = p.id AND s.user_id IS NULL;

-- Make user_id NOT NULL after backfilling
ALTER TABLE public.warehouses ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE public.locations ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE public.stock ALTER COLUMN user_id SET NOT NULL;

-- Drop existing RLS policies
DROP POLICY IF EXISTS "Anyone authenticated can view products" ON public.products;
DROP POLICY IF EXISTS "Admins and managers can insert products" ON public.products;
DROP POLICY IF EXISTS "Admins and managers can update products" ON public.products;
DROP POLICY IF EXISTS "Admins can delete products" ON public.products;

DROP POLICY IF EXISTS "Anyone authenticated can view warehouses" ON public.warehouses;
DROP POLICY IF EXISTS "Admins and managers can insert warehouses" ON public.warehouses;
DROP POLICY IF EXISTS "Admins and managers can update warehouses" ON public.warehouses;
DROP POLICY IF EXISTS "Admins can delete warehouses" ON public.warehouses;

DROP POLICY IF EXISTS "Anyone authenticated can view stock" ON public.stock;
DROP POLICY IF EXISTS "Admins and managers can manage stock" ON public.stock;

DROP POLICY IF EXISTS "Anyone authenticated can view locations" ON public.locations;
DROP POLICY IF EXISTS "Admins and managers can manage locations" ON public.locations;

DROP POLICY IF EXISTS "Anyone authenticated can view orders" ON public.orders;
DROP POLICY IF EXISTS "Admins and managers can insert orders" ON public.orders;
DROP POLICY IF EXISTS "Admins and managers can update orders" ON public.orders;
DROP POLICY IF EXISTS "Admins can delete orders" ON public.orders;

DROP POLICY IF EXISTS "Anyone authenticated can view receipts" ON public.receipts;
DROP POLICY IF EXISTS "Admins and managers can insert receipts" ON public.receipts;
DROP POLICY IF EXISTS "Admins and managers can update receipts" ON public.receipts;
DROP POLICY IF EXISTS "Admins can delete receipts" ON public.receipts;

DROP POLICY IF EXISTS "Anyone authenticated can view transfers" ON public.transfers;
DROP POLICY IF EXISTS "Admins and managers can insert transfers" ON public.transfers;
DROP POLICY IF EXISTS "Admins and managers can update transfers" ON public.transfers;
DROP POLICY IF EXISTS "Admins can delete transfers" ON public.transfers;

DROP POLICY IF EXISTS "Anyone authenticated can view order_items" ON public.order_items;
DROP POLICY IF EXISTS "Admins and managers can manage order_items" ON public.order_items;

DROP POLICY IF EXISTS "Anyone authenticated can view receipt_items" ON public.receipt_items;
DROP POLICY IF EXISTS "Admins and managers can manage receipt_items" ON public.receipt_items;

DROP POLICY IF EXISTS "Anyone authenticated can view transfer_items" ON public.transfer_items;
DROP POLICY IF EXISTS "Admins and managers can manage transfer_items" ON public.transfer_items;

-- Create new user-isolated RLS policies for products
CREATE POLICY "Users can view their own products" ON public.products
  FOR SELECT USING (created_by = auth.uid());

CREATE POLICY "Users can insert their own products" ON public.products
  FOR INSERT WITH CHECK (created_by = auth.uid());

CREATE POLICY "Users can update their own products" ON public.products
  FOR UPDATE USING (created_by = auth.uid());

CREATE POLICY "Users can delete their own products" ON public.products
  FOR DELETE USING (created_by = auth.uid());

-- Create new user-isolated RLS policies for warehouses
CREATE POLICY "Users can view their own warehouses" ON public.warehouses
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own warehouses" ON public.warehouses
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own warehouses" ON public.warehouses
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own warehouses" ON public.warehouses
  FOR DELETE USING (user_id = auth.uid());

-- Create new user-isolated RLS policies for stock
CREATE POLICY "Users can view their own stock" ON public.stock
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own stock" ON public.stock
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own stock" ON public.stock
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own stock" ON public.stock
  FOR DELETE USING (user_id = auth.uid());

-- Create new user-isolated RLS policies for locations
CREATE POLICY "Users can view their own locations" ON public.locations
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own locations" ON public.locations
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own locations" ON public.locations
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own locations" ON public.locations
  FOR DELETE USING (user_id = auth.uid());

-- Create new user-isolated RLS policies for orders
CREATE POLICY "Users can view their own orders" ON public.orders
  FOR SELECT USING (created_by = auth.uid());

CREATE POLICY "Users can insert their own orders" ON public.orders
  FOR INSERT WITH CHECK (created_by = auth.uid());

CREATE POLICY "Users can update their own orders" ON public.orders
  FOR UPDATE USING (created_by = auth.uid());

CREATE POLICY "Users can delete their own orders" ON public.orders
  FOR DELETE USING (created_by = auth.uid());

-- Create new user-isolated RLS policies for receipts
CREATE POLICY "Users can view their own receipts" ON public.receipts
  FOR SELECT USING (created_by = auth.uid());

CREATE POLICY "Users can insert their own receipts" ON public.receipts
  FOR INSERT WITH CHECK (created_by = auth.uid());

CREATE POLICY "Users can update their own receipts" ON public.receipts
  FOR UPDATE USING (created_by = auth.uid());

CREATE POLICY "Users can delete their own receipts" ON public.receipts
  FOR DELETE USING (created_by = auth.uid());

-- Create new user-isolated RLS policies for transfers
CREATE POLICY "Users can view their own transfers" ON public.transfers
  FOR SELECT USING (created_by = auth.uid());

CREATE POLICY "Users can insert their own transfers" ON public.transfers
  FOR INSERT WITH CHECK (created_by = auth.uid());

CREATE POLICY "Users can update their own transfers" ON public.transfers
  FOR UPDATE USING (created_by = auth.uid());

CREATE POLICY "Users can delete their own transfers" ON public.transfers
  FOR DELETE USING (created_by = auth.uid());

-- For child tables (order_items, receipt_items, transfer_items), we need to check the parent's owner
-- Create security definer functions to check ownership through parent tables

CREATE OR REPLACE FUNCTION public.order_belongs_to_user(order_id uuid, user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.orders 
    WHERE id = order_id AND created_by = user_id
  );
$$;

CREATE OR REPLACE FUNCTION public.receipt_belongs_to_user(receipt_id uuid, user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.receipts 
    WHERE id = receipt_id AND created_by = user_id
  );
$$;

CREATE OR REPLACE FUNCTION public.transfer_belongs_to_user(transfer_id uuid, user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.transfers 
    WHERE id = transfer_id AND created_by = user_id
  );
$$;

-- Create RLS policies for order_items
CREATE POLICY "Users can view their own order items" ON public.order_items
  FOR SELECT USING (public.order_belongs_to_user(order_id, auth.uid()));

CREATE POLICY "Users can insert their own order items" ON public.order_items
  FOR INSERT WITH CHECK (public.order_belongs_to_user(order_id, auth.uid()));

CREATE POLICY "Users can update their own order items" ON public.order_items
  FOR UPDATE USING (public.order_belongs_to_user(order_id, auth.uid()));

CREATE POLICY "Users can delete their own order items" ON public.order_items
  FOR DELETE USING (public.order_belongs_to_user(order_id, auth.uid()));

-- Create RLS policies for receipt_items
CREATE POLICY "Users can view their own receipt items" ON public.receipt_items
  FOR SELECT USING (public.receipt_belongs_to_user(receipt_id, auth.uid()));

CREATE POLICY "Users can insert their own receipt items" ON public.receipt_items
  FOR INSERT WITH CHECK (public.receipt_belongs_to_user(receipt_id, auth.uid()));

CREATE POLICY "Users can update their own receipt items" ON public.receipt_items
  FOR UPDATE USING (public.receipt_belongs_to_user(receipt_id, auth.uid()));

CREATE POLICY "Users can delete their own receipt items" ON public.receipt_items
  FOR DELETE USING (public.receipt_belongs_to_user(receipt_id, auth.uid()));

-- Create RLS policies for transfer_items
CREATE POLICY "Users can view their own transfer items" ON public.transfer_items
  FOR SELECT USING (public.transfer_belongs_to_user(transfer_id, auth.uid()));

CREATE POLICY "Users can insert their own transfer items" ON public.transfer_items
  FOR INSERT WITH CHECK (public.transfer_belongs_to_user(transfer_id, auth.uid()));

CREATE POLICY "Users can update their own transfer items" ON public.transfer_items
  FOR UPDATE USING (public.transfer_belongs_to_user(transfer_id, auth.uid()));

CREATE POLICY "Users can delete their own transfer items" ON public.transfer_items
  FOR DELETE USING (public.transfer_belongs_to_user(transfer_id, auth.uid()));