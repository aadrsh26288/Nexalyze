"use client";
import React, { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
	Loader2,
	CheckCircle,
	AlertCircle,
	XCircle,
	Lightbulb,
	Target,
	Zap,
	Search,
	Globe,
	Shield,
	Eye,
	ExternalLink,
} from "lucide-react";

const Analysis = () => {
	const [url, setUrl] = useState("");
	const [loading, setLoading] = useState(false);
	const [results, setResults] = useState(null);
	const [error, setError] = useState("");

	const handleSubmit = async () => {
		if (!url) return;

		setLoading(true);
		setError("");
		setResults(null);

		try {
			const response = await fetch("/api/audit", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({ url }),
			});

			const data = await response.json();

			if (!response.ok) {
				throw new Error(data.error || "Failed to analyze website");
			}

			setResults(data);
		} catch (err) {
			setError(err instanceof Error ? err.message : "An error occurred");
		} finally {
			setLoading(false);
		}
	};

	const formatSuggestions = (suggestions) => {
		// Clean up the suggestions text
		const cleanText = suggestions
			.replace(/#{1,6}\s*/g, "") // Remove markdown headers
			.replace(/\*{1,2}([^*]+)\*{1,2}/g, "$1") // Remove bold markdown but keep text
			.trim();

		// Split into sections by double line breaks
		const sections = cleanText
			.split(/\n\s*\n/)
			.filter((section) => section.trim());

		return sections
			.map((section, index) => {
				const lines = section.split("\n").filter((line) => line.trim());
				if (lines.length === 0) return null;

				// Determine section title and content
				let sectionTitle = lines[0].trim();
				let content = lines.slice(1);

				// If first line is a bullet point, create a generic title
				if (sectionTitle.startsWith("-") || sectionTitle.startsWith("•")) {
					sectionTitle = `Recommendations ${index + 1}`;
					content = lines;
				}

				const getSectionIcon = (title) => {
					const lowerTitle = title.toLowerCase();
					if (
						lowerTitle.includes("performance") ||
						lowerTitle.includes("speed")
					)
						return <Zap className='h-5 w-5 text-green-600' />;
					if (lowerTitle.includes("seo") || lowerTitle.includes("search"))
						return <Search className='h-5 w-5 text-blue-600' />;
					if (
						lowerTitle.includes("accessibility") ||
						lowerTitle.includes("access")
					)
						return <Eye className='h-5 w-5 text-purple-600' />;
					if (
						lowerTitle.includes("user") ||
						lowerTitle.includes("ux") ||
						lowerTitle.includes("experience")
					)
						return <Target className='h-5 w-5 text-pink-600' />;
					if (lowerTitle.includes("content") || lowerTitle.includes("text"))
						return <Globe className='h-5 w-5 text-orange-600' />;
					if (lowerTitle.includes("security") || lowerTitle.includes("safe"))
						return <Shield className='h-5 w-5 text-red-600' />;
					return <Lightbulb className='h-5 w-5 text-indigo-600' />;
				};

				const renderInlineFormatting = (text) => {
					// Handle links
					const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
					const parts = [];
					let lastIndex = 0;
					let match;

					while ((match = linkRegex.exec(text)) !== null) {
						// Add text before the link
						if (match.index > lastIndex) {
							parts.push(text.slice(lastIndex, match.index));
						}

						// Add the link
						parts.push(
							<a
								key={match.index}
								href={match[2]}
								target='_blank'
								rel='noopener noreferrer'
								className='inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 underline'>
								{match[1]}
								<ExternalLink className='h-3 w-3' />
							</a>,
						);

						lastIndex = match.index + match[0].length;
					}

					// Add remaining text
					if (lastIndex < text.length) {
						parts.push(text.slice(lastIndex));
					}

					return parts.length > 0 ? parts : text;
				};

				return (
					<div key={index} className='border-l-3 border-l-gray-200 pl-4 mb-6'>
						<div className='flex items-center gap-2 mb-3'>
							{getSectionIcon(sectionTitle)}
							<h3 className='text-lg font-semibold text-gray-800'>
								{sectionTitle}
							</h3>
						</div>
						<div className='space-y-2'>
							{content.map((line, lineIndex) => {
								const trimmedLine = line.trim();
								if (!trimmedLine) return null;

								// Handle bullet points
								if (
									trimmedLine.startsWith("-") ||
									trimmedLine.startsWith("•")
								) {
									const bulletText = trimmedLine.replace(/^[-•]\s*/, "");
									return (
										<div
											key={lineIndex}
											className='flex items-start gap-2 ml-2'>
											<span className='text-gray-400 mt-1 text-sm'>•</span>
											<p className='text-gray-700 leading-relaxed text-sm'>
												{renderInlineFormatting(bulletText)}
											</p>
										</div>
									);
								}

								// Regular text
								return (
									<p
										key={lineIndex}
										className='text-gray-700 leading-relaxed text-sm ml-2'>
										{renderInlineFormatting(trimmedLine)}
									</p>
								);
							})}
						</div>
					</div>
				);
			})
			.filter(Boolean);
	};

	const getScoreColor = (score) => {
		if (score >= 90) return "text-green-600";
		if (score >= 70) return "text-yellow-600";
		return "text-red-600";
	};

	const getScoreIcon = (score) => {
		if (score >= 90) return <CheckCircle className='h-5 w-5 text-green-600' />;
		if (score >= 70) return <AlertCircle className='h-5 w-5 text-yellow-600' />;
		return <XCircle className='h-5 w-5 text-red-600' />;
	};

	const getScoreBg = (score) => {
		if (score >= 90) return "from-green-50 to-emerald-100 border-green-200";
		if (score >= 70) return "from-yellow-50 to-amber-100 border-yellow-200";
		return "from-red-50 to-rose-100 border-red-200";
	};

	return (
		<div className='flex flex-col items-center justify-center mt-20 px-4'>
			<div className='text-center mb-8'>
				<h2 className='text-3xl font-bold mb-4 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent'>
					Website Performance Analyzer
				</h2>
				<p className='text-gray-600 max-w-2xl mx-auto'>
					Get instant insights about your website's performance, accessibility,
					SEO, and best practices with AI-powered recommendations.
				</p>
			</div>

			<div className='flex flex-row items-center justify-center mt-4 w-full max-w-2xl gap-3'>
				<Input
					type='url'
					className='flex-1 max-w-[500px] h-12'
					placeholder='https://example.com'
					value={url}
					onChange={(e) => setUrl(e.target.value)}
					disabled={loading}
					required
				/>
				<Button
					onClick={handleSubmit}
					className='cursor-pointer px-8 h-12 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-medium'
					disabled={loading || !url}>
					{loading ? <Loader2 className='h-4 w-4 animate-spin' /> : "Analyze"}
				</Button>
			</div>

			{error && (
				<Card className='mt-6 w-full max-w-2xl border-red-200 bg-red-50'>
					<CardContent className='pt-6 flex items-center gap-2'>
						<XCircle className='h-5 w-5 text-red-600' />
						<p className='text-red-700 font-medium'>{error}</p>
					</CardContent>
				</Card>
			)}

			{results && (
				<div className='mt-8 w-full max-w-6xl space-y-6'>
					{/* Header */}
					<Card className='border-t-4 border-t-blue-500'>
						<CardHeader className='text-center'>
							<CardTitle className='text-2xl'>Analysis Results</CardTitle>
							<p className='text-gray-600'>for {results.url}</p>
						</CardHeader>
					</Card>

					{/* Lighthouse Scores */}
					<Card>
						<CardHeader>
							<CardTitle className='flex items-center gap-2'>
								<Target className='h-6 w-6 text-blue-600' />
								Performance Metrics
							</CardTitle>
						</CardHeader>
						<CardContent>
							<div className='grid grid-cols-2 md:grid-cols-4 gap-4'>
								<div
									className={`text-center p-4 bg-gradient-to-br ${getScoreBg(
										Math.round(results.lighthouse.performance * 100),
									)} rounded-lg border`}>
									<div className='flex items-center justify-center gap-2 mb-2'>
										{getScoreIcon(
											Math.round(results.lighthouse.performance * 100),
										)}
										<div
											className={`text-2xl font-bold ${getScoreColor(
												Math.round(results.lighthouse.performance * 100),
											)}`}>
											{Math.round(results.lighthouse.performance * 100)}
										</div>
									</div>
									<div className='text-sm font-medium text-gray-700'>
										Performance
									</div>
								</div>
								<div
									className={`text-center p-4 bg-gradient-to-br ${getScoreBg(
										Math.round(results.lighthouse.accessibility * 100),
									)} rounded-lg border`}>
									<div className='flex items-center justify-center gap-2 mb-2'>
										{getScoreIcon(
											Math.round(results.lighthouse.accessibility * 100),
										)}
										<div
											className={`text-2xl font-bold ${getScoreColor(
												Math.round(results.lighthouse.accessibility * 100),
											)}`}>
											{Math.round(results.lighthouse.accessibility * 100)}
										</div>
									</div>
									<div className='text-sm font-medium text-gray-700'>
										Accessibility
									</div>
								</div>
								<div
									className={`text-center p-4 bg-gradient-to-br ${getScoreBg(
										Math.round(results.lighthouse.bestPractices * 100),
									)} rounded-lg border`}>
									<div className='flex items-center justify-center gap-2 mb-2'>
										{getScoreIcon(
											Math.round(results.lighthouse.bestPractices * 100),
										)}
										<div
											className={`text-2xl font-bold ${getScoreColor(
												Math.round(results.lighthouse.bestPractices * 100),
											)}`}>
											{Math.round(results.lighthouse.bestPractices * 100)}
										</div>
									</div>
									<div className='text-sm font-medium text-gray-700'>
										Best Practices
									</div>
								</div>
								<div
									className={`text-center p-4 bg-gradient-to-br ${getScoreBg(
										Math.round(results.lighthouse.seo * 100),
									)} rounded-lg border`}>
									<div className='flex items-center justify-center gap-2 mb-2'>
										{getScoreIcon(Math.round(results.lighthouse.seo * 100))}
										<div
											className={`text-2xl font-bold ${getScoreColor(
												Math.round(results.lighthouse.seo * 100),
											)}`}>
											{Math.round(results.lighthouse.seo * 100)}
										</div>
									</div>
									<div className='text-sm font-medium text-gray-700'>SEO</div>
								</div>
							</div>
						</CardContent>
					</Card>

					{/* AI Suggestions */}
					<Card>
						<CardHeader>
							<CardTitle className='flex items-center gap-2'>
								<Lightbulb className='h-6 w-6 text-yellow-600' />
								AI-Powered Recommendations
							</CardTitle>
							<p className='text-gray-600 text-sm'>
								Personalized suggestions to improve your website's performance
								and user experience
							</p>
						</CardHeader>
						<CardContent>
							<div className='space-y-4'>
								{formatSuggestions(results.suggestions)}
							</div>
						</CardContent>
					</Card>
				</div>
			)}
		</div>
	);
};

export default Analysis;
