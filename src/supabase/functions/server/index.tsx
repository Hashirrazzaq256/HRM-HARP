import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import { logger } from "npm:hono/logger";
import * as kv from "./kv_store.tsx";

const app = new Hono();

// Enable logger
app.use('*', logger(console.log));

// Enable CORS for all routes and methods
app.use(
  "/*",
  cors({
    origin: "*",
    allowHeaders: ["Content-Type", "Authorization"],
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    exposeHeaders: ["Content-Length"],
    maxAge: 600,
  }),
);

// Health check endpoint
app.get("/make-server-be2c25c4/health", (c) => {
  return c.json({ status: "ok" });
});

// Get all HRM data
app.get("/make-server-be2c25c4/hrm/data", async (c) => {
  try {
    const data = await kv.get("harp_hrm_data");
    
    if (!data) {
      return c.json({ data: null });
    }
    
    return c.json({ data: JSON.parse(data) });
  } catch (error) {
    console.error("Error getting HRM data:", error);
    return c.json({ error: `Failed to get HRM data: ${error.message}` }, 500);
  }
});

// Save/Update HRM data
app.post("/make-server-be2c25c4/hrm/data", async (c) => {
  try {
    const body = await c.req.json();
    
    if (!body.data) {
      return c.json({ error: "Missing data field in request body" }, 400);
    }
    
    await kv.set("harp_hrm_data", JSON.stringify(body.data));
    
    return c.json({ success: true });
  } catch (error) {
    console.error("Error saving HRM data:", error);
    return c.json({ error: `Failed to save HRM data: ${error.message}` }, 500);
  }
});

// Initialize HRM data with default values
app.post("/make-server-be2c25c4/hrm/init", async (c) => {
  try {
    const body = await c.req.json();
    
    if (!body.data) {
      return c.json({ error: "Missing data field in request body" }, 400);
    }
    
    // Check if data already exists
    const existingData = await kv.get("harp_hrm_data");
    
    if (existingData) {
      return c.json({ success: true, message: "Data already initialized", initialized: false });
    }
    
    // Initialize with provided data
    await kv.set("harp_hrm_data", JSON.stringify(body.data));
    
    return c.json({ success: true, message: "Data initialized successfully", initialized: true });
  } catch (error) {
    console.error("Error initializing HRM data:", error);
    return c.json({ error: `Failed to initialize HRM data: ${error.message}` }, 500);
  }
});

// Reset HRM data to initial state
app.post("/make-server-be2c25c4/hrm/reset", async (c) => {
  try {
    const body = await c.req.json();
    
    if (!body.data) {
      return c.json({ error: "Missing data field in request body" }, 400);
    }
    
    await kv.set("harp_hrm_data", JSON.stringify(body.data));
    
    return c.json({ success: true, message: "Data reset successfully" });
  } catch (error) {
    console.error("Error resetting HRM data:", error);
    return c.json({ error: `Failed to reset HRM data: ${error.message}` }, 500);
  }
});

Deno.serve(app.fetch);