// app/api/audit/route.ts
import { NextRequest, NextResponse } from "next/server";

interface LighthouseResult {
	performance: number;
	accessibility: number;
	bestPractices: number;
	seo: number;
	metrics: {
		firstContentfulPaint: number;
		largestContentfulPaint: number;
		firstInputDelay: number;
		cumulativeLayoutShift: number;
		speedIndex: number;
		totalBlockingTime: number;
	};
	pageInfo: {
		title: string;
		description: string;
		screenshot: string;
	};
	opportunities: Array<{
		id: string;
		title: string;
		description: string;
		savings: number;
	}>;
	diagnostics: Array<{
		id: string;
		title: string;
		description: string;
		displayValue: string;
	}>;
}

export async function POST(request: NextRequest) {
	try {
		const { url } = await request.json();

		if (!url) {
			return NextResponse.json({ error: "URL is required" }, { status: 400 });
		}

		// Validate URL format
		try {
			new URL(url);
		} catch {
			return NextResponse.json(
				{ error: "Invalid URL format" },
				{ status: 400 },
			);
		}

		console.log(`Starting PageSpeed Insights audit for: ${url}`);

		// Step 1: Run PageSpeed Insights audit
		const lighthouseResult = await runPageSpeedInsights(url);

		// Step 2: Generate AI suggestions using the real Lighthouse data
		const suggestions = await generateAISuggestions(lighthouseResult, url);

		return NextResponse.json({
			url,
			lighthouse: {
				performance: lighthouseResult.performance,
				accessibility: lighthouseResult.accessibility,
				bestPractices: lighthouseResult.bestPractices,
				seo: lighthouseResult.seo,
			},
			metrics: lighthouseResult.metrics,
			pageInfo: lighthouseResult.pageInfo,
			opportunities: lighthouseResult.opportunities,
			diagnostics: lighthouseResult.diagnostics,
			suggestions,
		});
	} catch (error) {
		console.error("Audit error:", error);
		return NextResponse.json(
			{ error: "Failed to audit website. Please try again." },
			{ status: 500 },
		);
	}
}

async function runPageSpeedInsights(url: string): Promise<LighthouseResult> {
	try {
		const apiKey = process.env.GOOGLE_PAGESPEED_API_KEY;

		if (!apiKey) {
			throw new Error("Google PageSpeed API key not configured");
		}

		// Encode URL to handle special characters
		const encodedUrl = encodeURIComponent(url);

		// Build API URL with all categories
		const apiUrl =
			`https://www.googleapis.com/pagespeedonline/v5/runPagespeed` +
			`?url=${encodedUrl}` +
			`&key=${apiKey}` +
			`&category=performance` +
			`&category=accessibility` +
			`&category=best-practices` +
			`&category=seo` +
			`&strategy=desktop` + // You can also use 'mobile'
			`&locale=en`;

		console.log(`Calling PageSpeed Insights API...`);

		const response = await fetch(apiUrl, {
			method: "GET",
			headers: {
				Accept: "application/json",
			},
		});

		if (!response.ok) {
			const errorText = await response.text();
			console.error(`PageSpeed API error: ${response.status} - ${errorText}`);
			throw new Error(
				`PageSpeed API error: ${response.status} ${response.statusText}`,
			);
		}

		const data = await response.json();

		// Extract Lighthouse results
		const lighthouseResult = data.lighthouseResult;
		const categories = lighthouseResult.categories;
		const audits = lighthouseResult.audits;

		// Extract Core Web Vitals and other metrics
		const metrics = {
			firstContentfulPaint: audits["first-contentful-paint"]?.numericValue || 0,
			largestContentfulPaint:
				audits["largest-contentful-paint"]?.numericValue || 0,
			firstInputDelay: audits["max-potential-fid"]?.numericValue || 0,
			cumulativeLayoutShift:
				audits["cumulative-layout-shift"]?.numericValue || 0,
			speedIndex: audits["speed-index"]?.numericValue || 0,
			totalBlockingTime: audits["total-blocking-time"]?.numericValue || 0,
		};

		// Extract page info
		const pageInfo = {
			title: audits["document-title"]?.displayValue || "No title",
			description: audits["meta-description"]?.displayValue || "No description",
			screenshot: lighthouseResult.fullPageScreenshot?.screenshot?.data || "",
		};

		// Extract opportunities (performance improvements)
		const opportunities = Object.entries(audits)
			.filter(
				([key, audit]: [string, any]) =>
					audit.details?.type === "opportunity" && audit.numericValue > 0,
			)
			.map(([key, audit]: [string, any]) => ({
				id: key,
				title: audit.title,
				description: audit.description,
				savings: audit.numericValue,
			}))
			.slice(0, 10); // Limit to top 10

		// Extract diagnostics (issues found)
		const diagnostics = Object.entries(audits)
			.filter(
				([key, audit]: [string, any]) =>
					audit.scoreDisplayMode === "binary" && audit.score < 1,
			)
			.map(([key, audit]: [string, any]) => ({
				id: key,
				title: audit.title,
				description: audit.description,
				displayValue: audit.displayValue || "",
			}))
			.slice(0, 10); // Limit to top 10

		return {
			performance: categories.performance?.score || 0,
			accessibility: categories.accessibility?.score || 0,
			bestPractices: categories["best-practices"]?.score || 0,
			seo: categories.seo?.score || 0,
			metrics,
			pageInfo,
			opportunities,
			diagnostics,
		};
	} catch (error: unknown) {
		if (error instanceof Error) {
			console.error("PageSpeed Insights error:", error.message);
			throw new Error(`Failed to run PageSpeed Insights: ${error.message}`);
		} else {
			console.error("Unknown error:", error);
			throw new Error(
				"Failed to run PageSpeed Insights due to an unknown error.",
			);
		}
	}
}

async function generateAISuggestions(
	lighthouseResult: LighthouseResult,
	url: string,
): Promise<string> {
	try {
		const prompt = createPromptFromLighthouseData(lighthouseResult, url);

		const response = await fetch(
			"https://openrouter.ai/api/v1/chat/completions",
			{
				method: "POST",
				headers: {
					Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
					"Content-Type": "application/json",
					"X-Title": "Website Audit Assistant",
				},
				body: JSON.stringify({
					model: "deepseek/deepseek-r1",
					messages: [
						{
							role: "user",
							content: prompt,
						},
					],
					temperature: 0.7,
					max_tokens: 2000,
				}),
			},
		);

		if (!response.ok) {
			const errorData = await response.text();
			console.error(`OpenRouter API error: ${response.status} - ${errorData}`);
			throw new Error(`OpenRouter API error: ${response.statusText}`);
		}

		const data = await response.json();
		return (
			data.choices?.[0]?.message?.content ||
			"Unable to generate AI suggestions at this time."
		);
	} catch (error) {
		console.error("AI suggestion error:", error);
		return generateFallbackSuggestions(lighthouseResult);
	}
}

function createPromptFromLighthouseData(
	lighthouseResult: LighthouseResult,
	url: string,
): string {
	const {
		performance,
		accessibility,
		bestPractices,
		seo,
		metrics,
		opportunities,
		diagnostics,
	} = lighthouseResult;

	const topOpportunities = opportunities
		.slice(0, 5)
		.map(
			(opp) =>
				`- ${opp.title}: ${opp.description} (Potential savings: ${Math.round(
					opp.savings,
				)}ms)`,
		)
		.join("\n");

	const topIssues = diagnostics
		.slice(0, 5)
		.map((diag) => `- ${diag.title}: ${diag.description}`)
		.join("\n");

	return `Analyze this comprehensive Lighthouse audit from Google PageSpeed Insights and provide specific, actionable improvement suggestions:

Website: ${url}

**Lighthouse Scores (Google PageSpeed Insights):**
- Performance: ${Math.round(performance * 100)}/100
- Accessibility: ${Math.round(accessibility * 100)}/100  
- Best Practices: ${Math.round(bestPractices * 100)}/100
- SEO: ${Math.round(seo * 100)}/100

**Core Web Vitals & Performance Metrics:**
- First Contentful Paint: ${Math.round(metrics.firstContentfulPaint)}ms
- Largest Contentful Paint: ${Math.round(metrics.largestContentfulPaint)}ms
- Cumulative Layout Shift: ${metrics.cumulativeLayoutShift.toFixed(3)}
- Total Blocking Time: ${Math.round(metrics.totalBlockingTime)}ms
- Speed Index: ${Math.round(metrics.speedIndex)}

**Top Performance Opportunities:**
${topOpportunities || "No major opportunities identified"}

**Issues Detected:**
${topIssues || "No major issues detected"}

**Page Information:**
- Title: "${lighthouseResult.pageInfo.title}"
- Meta Description: "${lighthouseResult.pageInfo.description}"

Please provide comprehensive, actionable recommendations organized by priority and impact. Focus on:

1. **Performance Optimization** (High Impact)
2. **SEO Improvements** (Quick Wins)  
3. **Accessibility Enhancements** (Compliance)
4. **Best Practices** (Technical Excellence)
5. **User Experience** (Beyond Code)
6. **Content & Design** (Non-technical improvements)
7. **Security** (Best practices)
8.** what other sections you can add to attract audience **

For each suggestion:
- Explain WHY it matters
- Provide HOW to implement it
- Include tools/resources when helpful
- Prioritize by impact vs effort
- Use real-world examples when possible
- Avoid generic advice; tailor to this specific audit
- Consider both technical and non-technical aspects
- Highlight any quick wins that can be implemented immediately

Use a friendly, professional tone with clear sections, bullet points, and actionable steps. Make it comprehensive but digestible.`;
}

function generateFallbackSuggestions(
	lighthouseResult: LighthouseResult,
): string {
	const { performance, accessibility, bestPractices, seo, metrics } =
		lighthouseResult;

	let suggestions = `# Website Audit Results\n\n`;

	// Performance suggestions
	if (performance < 0.9) {
		suggestions += `## 🚀 Performance Improvements\n\n`;
		if (metrics.largestContentfulPaint > 2500) {
			suggestions += `- **Optimize Largest Contentful Paint**: Your LCP is ${Math.round(
				metrics.largestContentfulPaint,
			)}ms. Optimize your largest image or text block.\n`;
		}
		if (metrics.totalBlockingTime > 200) {
			suggestions += `- **Reduce JavaScript Blocking**: ${Math.round(
				metrics.totalBlockingTime,
			)}ms of blocking time. Minimize and defer non-critical JS.\n`;
		}
		suggestions += `- Compress images and use modern formats (WebP, AVIF)\n`;
		suggestions += `- Enable browser caching and CDN\n\n`;
	}

	// SEO suggestions
	if (seo < 0.9) {
		suggestions += `## 🔍 SEO Enhancements\n\n`;
		suggestions += `- Optimize meta descriptions and title tags\n`;
		suggestions += `- Improve internal linking structure\n`;
		suggestions += `- Add structured data markup\n\n`;
	}

	// Accessibility suggestions
	if (accessibility < 0.9) {
		suggestions += `## ♿ Accessibility Improvements\n\n`;
		suggestions += `- Add alt text to all images\n`;
		suggestions += `- Ensure proper color contrast ratios\n`;
		suggestions += `- Make all interactive elements keyboard accessible\n\n`;
	}

	return suggestions;
}
