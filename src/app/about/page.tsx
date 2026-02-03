"use client";

import Link from "next/link";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ArrowLeft,
  Info,
  Shield,
  MapPin,
  Database,
  Code,
  MessageSquarePlus,
  MessageCircle,
  Lightbulb,
  ExternalLink,
} from "lucide-react";

export default function AboutPage() {
  return (
    <div className="container mx-auto py-8 px-4 max-w-4xl">
      {/* Header */}
      <div className="mb-8 flex items-start justify-between">
        <div>
          <Link href="/">
            <Button variant="ghost" size="sm" className="mb-2 -ml-2">
              <ArrowLeft className="h-4 w-4 mr-1" />
              Back to Rankings
            </Button>
          </Link>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <Info className="h-8 w-8" />
            About This App
          </h1>
          <p className="text-muted-foreground mt-2">
            Why this exists, how it works, and what makes it different
          </p>
        </div>
        <ThemeToggle />
      </div>

      <div className="space-y-6">
        {/* Why I Built This */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lightbulb className="h-5 w-5 text-yellow-500" />
              Why This Exists
            </CardTitle>
          </CardHeader>
          <CardContent className="prose prose-slate dark:prose-invert max-w-none">
            <p>
              Generic &quot;Best Places to Live&quot; lists treat everyone the same. They assume
              you care about the same things as everyone else&mdash;usually some blend of job
              growth, median income, and crime rates.
            </p>
            <p>
              But your perfect city depends on <strong>your</strong> priorities. Maybe you&apos;d
              trade a higher cost of living for walkability. Maybe political alignment matters
              more to you than nightlife. Maybe you need mountains within an hour&apos;s drive.
            </p>
            <p>
              This tool lets you define what matters and see how cities stack up against{" "}
              <em>your</em> criteria&mdash;not some editor&apos;s idea of what a &quot;good city&quot;
              looks like.
            </p>
          </CardContent>
        </Card>

        {/* Privacy First */}
        <Card className="border-green-200 dark:border-green-900">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-green-500" />
              Privacy First
            </CardTitle>
          </CardHeader>
          <CardContent className="prose prose-slate dark:prose-invert max-w-none">
            <p>
              This app asks about sensitive preferences&mdash;your political leanings, religious
              background, dating priorities. That data <strong>never leaves your device</strong>.
            </p>
            <ul>
              <li>
                <strong>100% client-side:</strong> All scoring calculations happen in your
                browser. There are no server roundtrips for your preferences.
              </li>
              <li>
                <strong>localStorage only:</strong> Your settings are saved to your browser&apos;s
                local storage. Clear your browser data, and it&apos;s gone.
              </li>
              <li>
                <strong>No accounts:</strong> No email, no login, no way to tie your preferences
                to an identity.
              </li>
              <li>
                <strong>No tracking pixels:</strong> We use Vercel Analytics for aggregate page
                views, but we don&apos;t track what preferences you set or which cities you view.
              </li>
            </ul>
            <p className="text-sm text-muted-foreground bg-muted p-3 rounded-lg">
              We physically cannot sell your data because we never receive it. This isn&apos;t a
              policy decision&mdash;it&apos;s an architectural one.
            </p>
          </CardContent>
        </Card>

        {/* The Cities */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5 text-blue-500" />
              The Cities (~45 Archetypes)
            </CardTitle>
          </CardHeader>
          <CardContent className="prose prose-slate dark:prose-invert max-w-none">
            <p>
              This isn&apos;t an encyclopedia of every US city. It&apos;s a curated set of{" "}
              <strong>archetype cities</strong> designed to span different lifestyles:
            </p>
            <ul>
              <li>Tech hubs (San Francisco, Seattle, Austin)</li>
              <li>Affordable metros (Houston, Phoenix, Indianapolis)</li>
              <li>Beach towns (Miami, San Diego, Tampa)</li>
              <li>Mountain cities (Denver, Salt Lake City, Boise)</li>
              <li>Cultural capitals (New York, Chicago, New Orleans)</li>
              <li>Mid-size gems (Raleigh, Nashville, Portland)</li>
            </ul>
            <p>
              The goal is to help you <strong>discover what you value</strong>. If you find
              yourself drawn to Denver over Miami, that tells you something about your
              priorities&mdash;even if neither is where you end up.
            </p>
            <p className="text-sm text-muted-foreground">
              Don&apos;t see a city you care about?{" "}
              <a href="#request-city" className="text-primary hover:underline">
                Request it below
              </a>
              .
            </p>
          </CardContent>
        </Card>

        {/* Data Sources */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5 text-orange-500" />
              Data Sources &amp; Freshness
            </CardTitle>
          </CardHeader>
          <CardContent className="prose prose-slate dark:prose-invert max-w-none">
            <p>
              All data comes from authoritative public sources. Here&apos;s what powers the
              rankings:
            </p>
            <div className="not-prose">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 font-medium">Category</th>
                    <th className="text-left py-2 font-medium">Source</th>
                    <th className="text-left py-2 font-medium">Vintage</th>
                  </tr>
                </thead>
                <tbody className="text-muted-foreground">
                  <tr className="border-b">
                    <td className="py-2">Cost of Living</td>
                    <td>BEA Regional Price Parities</td>
                    <td>2023</td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-2">Demographics</td>
                    <td>Census ACS 5-Year</td>
                    <td>2022</td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-2">Crime</td>
                    <td>FBI Uniform Crime Report</td>
                    <td>2022</td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-2">Climate</td>
                    <td>NOAA Climate Normals</td>
                    <td>1991-2020</td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-2">Walkability</td>
                    <td>Walk Score API</td>
                    <td>2024</td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-2">Nightlife/Dining</td>
                    <td>OpenStreetMap</td>
                    <td>2024</td>
                  </tr>
                  <tr>
                    <td className="py-2">Political</td>
                    <td>MIT Election Lab</td>
                    <td>2020-2024</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="mt-4">
              <strong>Important:</strong> This tool compares <em>relative</em> affordability and
              quality using standardized baselines. Real-time rent prices fluctuate daily; these
              scores tell you how cities compare to each other, not what your exact rent will be.
            </p>
            <p className="text-sm text-muted-foreground">
              For detailed methodology on each scoring category, see the{" "}
              <Link href="/help" className="text-primary hover:underline">
                Help page
              </Link>
              .
            </p>
          </CardContent>
        </Card>

        {/* Under the Hood */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Code className="h-5 w-5 text-purple-500" />
              Under the Hood
            </CardTitle>
          </CardHeader>
          <CardContent className="prose prose-slate dark:prose-invert max-w-none">
            <p>For the technically curious (or potential employers/collaborators):</p>
            <ul>
              <li>
                <strong>Framework:</strong> Next.js 15 with App Router
              </li>
              <li>
                <strong>Language:</strong> TypeScript (strict mode)
              </li>
              <li>
                <strong>Styling:</strong> Tailwind CSS + shadcn/ui components
              </li>
              <li>
                <strong>State:</strong> Zustand with localStorage persistence
              </li>
              <li>
                <strong>Data:</strong> PostgreSQL + JSON (scoring is client-side)
              </li>
              <li>
                <strong>Hosting:</strong> Vercel
              </li>
            </ul>
            <p>
              The key architectural decision is <strong>client-side scoring</strong>. When you
              adjust a preference slider, the rankings update instantly because the calculation
              happens in your browser&mdash;no waiting for a server response.
            </p>
            <p className="text-sm text-muted-foreground">
              Source code available on{" "}
              <a
                href="https://github.com/jyzhang23/where_should_i_live"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline inline-flex items-center gap-1"
              >
                GitHub
                <ExternalLink className="h-3 w-3" />
              </a>
            </p>
          </CardContent>
        </Card>

        {/* Request a City */}
        <Card id="request-city">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquarePlus className="h-5 w-5 text-teal-500" />
              Request a City
            </CardTitle>
          </CardHeader>
          <CardContent className="prose prose-slate dark:prose-invert max-w-none">
            <p>
              Don&apos;t see a city that matters to you? I&apos;d love to hear which ones you want
              added. This helps prioritize expansion of the dataset.
            </p>
            <div className="flex flex-wrap gap-3 not-prose">
              <a
                href="https://github.com/jyzhang23/where_should_i_live/issues/new?title=City%20Request:%20[City%20Name]&body=Please%20add%20[City,%20State]%20to%20the%20app.%0A%0AWhy%20this%20city%20matters%20to%20me:%0A"
                target="_blank"
                rel="noopener noreferrer"
              >
                <Button variant="outline">
                  <MessageSquarePlus className="h-4 w-4 mr-2" />
                  Request a City
                  <ExternalLink className="h-3 w-3 ml-1" />
                </Button>
              </a>
              <a
                href="https://github.com/jyzhang23/where_should_i_live/issues/new?title=Feedback:%20[Topic]&body=**What%20feedback%20do%20you%20have%3F**%0A%0A**Is%20this%20a%20bug%2C%20feature%20request%2C%20or%20general%20comment%3F**%0A%0A"
                target="_blank"
                rel="noopener noreferrer"
              >
                <Button variant="outline">
                  <MessageCircle className="h-4 w-4 mr-2" />
                  Other Feedback
                  <ExternalLink className="h-3 w-3 ml-1" />
                </Button>
              </a>
            </div>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center text-sm text-muted-foreground pt-4">
          <p>
            Built with care by someone who spent way too long researching where to live.
          </p>
          <p className="mt-2">
            <Link href="/help" className="text-primary hover:underline">
              How Rankings Work
            </Link>
            {" · "}
            <Link href="/" className="text-primary hover:underline">
              Back to Rankings
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
