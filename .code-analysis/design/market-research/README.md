# Market Research Concept — Complete Clickable Flow

## 🎯 Overview

This folder contains a complete, clickable prototype for **Researchio** — an AI-powered market research tool that analyzes your idea, finds competitors, and provides actionable insights.

## 📁 Files

- **index.html** — Marketing landing page (first page visitors see)
- **start.html** — Idea input page where users describe their product
- **analysis.html** — Main market analysis page with live competitor discovery
- **competitor-detail.html** — Detailed view of a single competitor (Snyk example)
- **final-summary.html** — Final summary report with recommendations

## 🔄 User Flow

```
index.html
    ↓
    [Marketing landing page]
    ↓
start.html
    ↓
    [User enters idea & clicks "Analyze Market"]
    ↓
analysis.html
    ↓
    [View live AI analysis with competitor cards]
    ↓
    ├─→ competitor-detail.html (click any competitor)
    │       ↓
    │       [View detailed competitor analysis]
    │       ↓
    │   [Back to analysis] → returns to analysis.html
    │
    └─→ final-summary.html (click "View Summary" in navbar)
            ↓
            [View complete market analysis report]
            ↓
        [Run new analysis] → returns to index.html
```

## 🚀 Getting Started

1. Open **index.html** in your browser
2. Click "Get started free" to begin
3. Enter an idea or click one of the example chips
4. Click "Analyze Market" to see the analysis page
4. Explore:
   - Click any competitor card to see detailed analysis
   - Click "View Summary" button to see the final report
   - Logo always returns to start page

## ✨ Key Features

### Start Page (index.html)
- Clean marketing landing page
- Hero section with value proposition
- Feature pills showing key benefits
- Pricing section with 4 tiers
- "Get started free" CTA

### Idea Input Page (start.html)
- Clean landing with idea input
- Example chips to pre-fill common ideas
- "Analyze Market" button to begin analysis

### Analysis Page (analysis.html)
- **Left panel**: Competitor grid with analysis status
  - ✓ Done — Analysis complete (clickable)
  - ⟳ Analyzing — Currently analyzing
  - Queued — Waiting to start
- **Right panel**: Live AI activity feed
  - Shows real-time agent actions
  - Navigation, extraction, writing events
  - Stats bar at bottom

### Competitor Detail (competitor-detail.html)
- Full breakdown of a single competitor
- Core features, pricing, strengths/weaknesses
- Competitive insights and differentiation opportunities
- Back button returns to analysis page

### Final Summary (final-summary.html)
- Complete market analysis report
- ✓ Market verdict (worth entering or not)
- Full competitor comparison table
- Key opportunities & risks
- Go-to-market strategy recommendations
- Pricing recommendations

## 🎨 Design System

- **Product**: Researchio (market research SaaS)
- **Color scheme**: Purple/blue gradients (#6366f1, #7c3aed)
- **Typography**: Inter font family
- **Components**: Cards, badges, tables, live feed
- **Dark mode**: Hero cards use dark purple gradient

## 🔗 Navigation Links

All pages are fully linked:
- **Logo** → index.html (from all pages)
- **Get started free button** → start.html
- **Analyze Market button** → analysis.html
- **Competitor cards** → competitor-detail.html
- **View Summary button** → final-summary.html
- **Back to analysis** → analysis.html
- **Run new analysis** → index.html

## 🎭 Interactive Elements

- Example chips fill the input textarea
- Competitor cards show analysis status
- Live feed displays real-time AI activity
- All links and buttons are functional
- Mobile-responsive burger menu (navbar)

## 📱 Responsive Design

All pages include mobile breakpoints:
- Navbar collapses to burger menu
- Competitor grid stacks on mobile
- Feed panel hides on small screens
- Tables scroll horizontally on mobile

## 💡 Pro Tips

1. Open in Chrome/Edge for best experience
2. Start with **index.html** as the entry point
3. Click "Get started free" to see the  idea input form
3. Notice the live feed updating as "analysis" runs
4. Check out the AI agent tags in the feed entries
5. Explore all competitor detail sections

---

**Built with**: Pure HTML/CSS • No dependencies • Ready to ship 🚀
