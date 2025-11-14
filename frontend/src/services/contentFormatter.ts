export interface EmbeddedContent {
  type: 'quiz' | 'image' | 'illustration';
  position: number; // 0-100 percentage in content
  data: any;
}

export interface EnhancedSection {
  type: 'concept' | 'example' | 'analogy' | 'question' | 'summary';
  title: string;
  content: string;
  teachingStyle: 'socratic' | 'direct' | 'constructivist' | 'encouraging';
  keyPoints: string[];
  examples?: string[];
  analogies?: string[];
  questions?: string[];
}

export class ContentFormatter {
  /**
   * Format raw text into visually appealing HTML with embedded content
   */
  formatContent(rawText: string, embeddedContent: EmbeddedContent[] = []): string {
    // First, convert plain text to structured HTML
    let formatted = this.structureText(rawText);

    // Then embed quizzes and images at appropriate positions
    formatted = this.embedContent(formatted, embeddedContent);

    return formatted;
  }

  /**
   * Format AI-enhanced sections into HTML
   * This displays the actual AI-enhanced teaching content with style
   */
  formatEnhancedContent(enhancedSections: EnhancedSection[], embeddedContent: EmbeddedContent[] = []): string {
    if (!enhancedSections || enhancedSections.length === 0) {
      return '<p class="text-gray-500 italic">No enhanced content available</p>';
    }

    // Generate teaching style badge CSS class
    const getStyleBadge = (style: string) => {
      const badges: Record<string, string> = {
        socratic: 'from-purple-500 to-indigo-500',
        direct: 'from-blue-500 to-cyan-500',
        constructivist: 'from-green-500 to-emerald-500',
        encouraging: 'from-pink-500 to-rose-500'
      };
      return badges[style] || 'from-gray-500 to-gray-600';
    };

    // Format each section with enhanced styling
    const htmlSections = enhancedSections.map((section, index) => {
      const styleBadgeClass = getStyleBadge(section.teachingStyle);

      return `
        <div class="enhanced-section mb-12 bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
          <!-- Section Header with Teaching Style -->
          <div class="bg-gradient-to-r ${styleBadgeClass} px-6 py-4">
            <div class="flex items-center justify-between">
              <h2 class="text-2xl font-bold text-white flex items-center gap-3">
                <span class="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center text-lg">📚</span>
                ${this.escapeHtml(section.title)}
              </h2>
              <span class="px-3 py-1 bg-white/20 rounded-full text-sm font-medium text-white capitalize">
                ${section.teachingStyle}
              </span>
            </div>
          </div>

          <!-- Section Content -->
          <div class="p-6">
            <!-- Main Content -->
            <div class="prose prose-lg max-w-none mb-6">
              ${this.formatEnhancedText(section.content)}
            </div>

            <!-- Key Points -->
            ${section.keyPoints && section.keyPoints.length > 0 ? `
              <div class="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg p-5 mb-5 border-l-4 border-blue-500">
                <h3 class="text-lg font-semibold text-blue-900 mb-3 flex items-center gap-2">
                  <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                  </svg>
                  Key Points
                </h3>
                <ul class="space-y-2">
                  ${section.keyPoints.map(point => `
                    <li class="flex items-start gap-2 text-gray-700">
                      <span class="text-blue-600 font-bold mt-1">•</span>
                      <span>${this.escapeHtml(point)}</span>
                    </li>
                  `).join('')}
                </ul>
              </div>
            ` : ''}

            <!-- Examples -->
            ${section.examples && section.examples.length > 0 ? `
              <div class="bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg p-5 mb-5 border-l-4 border-green-500">
                <h3 class="text-lg font-semibold text-green-900 mb-3 flex items-center gap-2">
                  <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"></path>
                  </svg>
                  Examples
                </h3>
                <ul class="space-y-2">
                  ${section.examples.map(example => `
                    <li class="flex items-start gap-2 text-gray-700">
                      <span class="text-green-600 font-bold mt-1">→</span>
                      <span>${this.escapeHtml(example)}</span>
                    </li>
                  `).join('')}
                </ul>
              </div>
            ` : ''}

            <!-- Analogies -->
            ${section.analogies && section.analogies.length > 0 ? `
              <div class="bg-gradient-to-br from-purple-50 to-pink-50 rounded-lg p-5 mb-5 border-l-4 border-purple-500">
                <h3 class="text-lg font-semibold text-purple-900 mb-3 flex items-center gap-2">
                  <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path>
                  </svg>
                  Analogies
                </h3>
                <ul class="space-y-2">
                  ${section.analogies.map(analogy => `
                    <li class="flex items-start gap-2 text-gray-700">
                      <span class="text-purple-600 font-bold mt-1">≈</span>
                      <span>${this.escapeHtml(analogy)}</span>
                    </li>
                  `).join('')}
                </ul>
              </div>
            ` : ''}

            <!-- Questions -->
            ${section.questions && section.questions.length > 0 ? `
              <div class="bg-gradient-to-br from-yellow-50 to-orange-50 rounded-lg p-5 border-l-4 border-yellow-500">
                <h3 class="text-lg font-semibold text-yellow-900 mb-3 flex items-center gap-2">
                  <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                  </svg>
                  Questions to Consider
                </h3>
                <ul class="space-y-2">
                  ${section.questions.map(question => `
                    <li class="flex items-start gap-2 text-gray-700">
                      <span class="text-yellow-600 font-bold mt-1">?</span>
                      <span>${this.escapeHtml(question)}</span>
                    </li>
                  `).join('')}
                </ul>
              </div>
            ` : ''}
          </div>
        </div>
      `;
    }).join('\n');

    return htmlSections;
  }

  /**
   * Format enhanced text with teaching style indicators
   */
  private formatEnhancedText(text: string): string {
    // Split into paragraphs and format each
    const paragraphs = text.split(/\n\s*\n/);

    return paragraphs.map(paragraph => {
      const trimmed = paragraph.trim();
      if (!trimmed) return '';

      // Check for questions (Socratic style)
      if (trimmed.includes('?') || trimmed.startsWith('What') || trimmed.startsWith('How') || trimmed.startsWith('Why')) {
        return `
          <div class="bg-gradient-to-r from-purple-50 to-indigo-50 border-l-4 border-purple-500 p-4 rounded-r-lg mb-4">
            <p class="text-gray-800 leading-relaxed flex items-start gap-2">
              <svg class="w-6 h-6 text-purple-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              </svg>
              <span class="text-lg">${this.escapeHtml(trimmed)}</span>
            </p>
          </div>
        `;
      }

      // Check for encouraging language
      if (trimmed.includes('excellent') || trimmed.includes('great') || trimmed.includes('wonderful') || trimmed.includes('fantastic')) {
        return `
          <div class="bg-gradient-to-r from-pink-50 to-rose-50 border-l-4 border-pink-500 p-4 rounded-r-lg mb-4">
            <p class="text-gray-800 leading-relaxed flex items-start gap-2">
              <svg class="w-6 h-6 text-pink-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"></path>
              </svg>
              <span class="text-lg">${this.escapeHtml(trimmed)}</span>
            </p>
          </div>
        `;
      }

      // Regular paragraph with enhanced styling
      return `
        <div class="mb-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
          <p class="text-gray-700 leading-relaxed text-lg">${this.escapeHtml(trimmed)}</p>
        </div>
      `;
    }).join('\n');
  }

  /**
   * Convert plain text into structured HTML with headings, paragraphs, lists
   */
  private structureText(text: string): string {
    let html = text;

    // Split into paragraphs
    const paragraphs = html.split(/\n\s*\n/);

    html = paragraphs.map(paragraph => {
      const trimmed = paragraph.trim();
      if (!trimmed) return '';

      // Check if it's a heading (all caps or starts with number)
      if (this.isHeading(trimmed)) {
        const level = this.getHeadingLevel(trimmed);
        const text = trimmed.replace(/^\d+(\.\d+)*\s*/, ''); // Remove numbering

        if (level === 1) {
          return `
            <div class="mt-10 mb-6 pb-3 border-b-2 border-blue-600">
              <h1 class="text-4xl font-extrabold text-gray-900 tracking-tight">${this.escapeHtml(text)}</h1>
            </div>
          `;
        } else if (level === 2) {
          return `
            <h2 class="text-2xl font-bold mt-8 mb-4 text-gray-900 flex items-center">
              <span class="w-1 h-6 bg-blue-600 mr-3 rounded"></span>
              ${this.escapeHtml(text)}
            </h2>
          `;
        } else {
          return `
            <h3 class="text-xl font-semibold mt-6 mb-3 text-gray-800">${this.escapeHtml(text)}</h3>
          `;
        }
      }

      // Check if it's a list item
      if (this.isListItem(trimmed)) {
        const listType = this.getListType(trimmed);
        const text = trimmed.replace(/^[-*•]\s*/, '').replace(/^\d+[.)]\s*/, '');
        return `<li class="ml-6 mb-3 text-gray-700 leading-relaxed flex items-start"><span class="text-blue-600 font-bold mr-2">•</span>${this.escapeHtml(text)}</li>`;
      }

      // Regular paragraph with enhanced typography
      return `
        <div class="mb-6">
          <p class="text-gray-700 leading-relaxed text-base">${this.escapeHtml(trimmed)}</p>
        </div>
      `;
    }).join('\n');

    // Wrap consecutive list items into <ul> or <ol> tags
    html = this.wrapLists(html);

    return html;
  }

  /**
   * Embed quizzes and images at strategic positions
   */
  private embedContent(html: string, embeddedContent: EmbeddedContent[]): string {
    if (embeddedContent.length === 0) return html;

    // Split HTML into paragraphs to find insertion points
    const sections = html.split(/(?=<h\d+|<p)/);
    let result = sections[0] || '';

    embeddedContent.sort((a, b) => a.position - b.position);

    embeddedContent.forEach((content, index) => {
      const sectionIndex = Math.floor((content.position / 100) * sections.length);
      const section = sections[sectionIndex] || sections[sections.length - 1];

      let embeddedHtml = '';

      if (content.type === 'quiz') {
        embeddedHtml = this.generateQuizEmbed(content.data);
      } else if (content.type === 'image') {
        embeddedHtml = this.generateImageEmbed(content.data);
      }

      result += '\n' + embeddedHtml + '\n' + section;
    });

    // Add any remaining sections
    for (let i = sections.length - 1; i > embeddedContent.length; i--) {
      result += '\n' + sections[i];
    }

    return result;
  }

  /**
   * Generate HTML for embedded quiz
   */
  private generateQuizEmbed(quizData: any): string {
    const quizId = `quiz_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    return `
      <div class="my-10 p-6 bg-gradient-to-br from-indigo-50 to-blue-50 border border-indigo-200 rounded-xl shadow-lg">
        <div class="flex items-center gap-3 mb-5">
          <div class="flex items-center justify-center w-10 h-10 bg-indigo-600 text-white rounded-full">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
          </div>
          <h3 class="text-xl font-bold text-indigo-900">Quick Check</h3>
        </div>
        <p class="text-indigo-700 mb-4 font-medium">Test your understanding of the concepts above:</p>
        <div class="bg-white p-6 rounded-lg border border-indigo-200 shadow-sm">
          <p class="text-gray-800 mb-5 text-lg font-medium">${quizData.question || 'What is the main concept discussed in this section?'}</p>
          ${quizData.options ? `
            <div class="mt-4 space-y-3">
              ${quizData.options.map((opt: string, idx: number) => `
                <label class="flex items-start gap-3 p-3 rounded-lg cursor-pointer transition-all hover:bg-gray-50 group">
                  <input type="radio" name="${quizId}" value="${idx}" class="mt-1 text-indigo-600 focus:ring-indigo-500">
                  <span class="text-gray-700 group-hover:text-gray-900 flex-1">${opt}</span>
                </label>
              `).join('')}
            </div>
            <div class="mt-6">
              <button
                onclick="checkQuizAnswer('${quizId}', ${quizData.correctAnswer}, '${quizData.explanation.replace(/'/g, "\\'")}')"
                class="px-6 py-3 bg-gradient-to-r from-indigo-600 to-blue-600 text-white rounded-lg hover:from-indigo-700 hover:to-blue-700 transition-all font-semibold shadow-md hover:shadow-lg"
              >
                Check Answer
              </button>
            </div>
            <div id="${quizId}_result" class="mt-4 hidden"></div>
          ` : ''}
        </div>
      </div>
      <script>
        function checkQuizAnswer(quizId, correctAnswer, explanation) {
          const selected = document.querySelector('input[name="' + quizId + '"]:checked');
          const resultDiv = document.getElementById(quizId + '_result');

          if (!selected) {
            resultDiv.className = 'mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg text-yellow-800';
            resultDiv.innerHTML = '<strong>Please select an answer!</strong>';
            resultDiv.classList.remove('hidden');
            return;
          }

          const userAnswer = parseInt(selected.value);
          const isCorrect = userAnswer === correctAnswer;

          resultDiv.className = 'mt-4 p-4 rounded-lg ' + (isCorrect ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200');
          resultDiv.innerHTML = isCorrect
            ? '<div class="flex items-start gap-2"><svg class="w-6 h-6 text-green-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg><div><strong class="text-green-800 block mb-1">Correct! Well done! 🎉</strong><p class="text-green-700">' + explanation + '</p></div></div>'
            : '<div class="flex items-start gap-2"><svg class="w-6 h-6 text-red-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg><div><strong class="text-red-800 block mb-1">Not quite right.</strong><p class="text-red-700">' + explanation + '</p></div></div>';
          resultDiv.classList.remove('hidden');
        }
      </script>
    `;
  }

  /**
   * Generate HTML for embedded image
   */
  private generateImageEmbed(imageData: any): string {
    return `
      <div class="my-10 p-5 bg-white rounded-xl border border-gray-200 shadow-lg hover:shadow-xl transition-shadow duration-300">
        <img src="${imageData.url || 'https://via.placeholder.com/800x400/4f46e5/ffffff?text=Concept+Diagram'}"
             alt="${imageData.title || 'Illustration'}"
             class="w-full rounded-lg shadow-md mb-4 hover:scale-[1.01] transition-transform duration-300">
        <div class="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-lg border-l-4 border-indigo-500">
          <h4 class="font-semibold text-indigo-900 mb-2 flex items-center">
            <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
            </svg>
            ${imageData.title || 'Concept Illustration'}
          </h4>
          ${imageData.caption ? `<p class="text-sm text-gray-700 leading-relaxed">${imageData.caption}</p>` : ''}
        </div>
      </div>
    `;
  }

  /**
   * Extract content section around a specific position for contextual processing
   */
  extractContentSection(content: string, position: number, charLimit: number = 800): string {
    const totalChars = content.length;
    const targetPos = Math.floor((position / 100) * totalChars);

    // Calculate start position (go back half the charLimit)
    const startPos = Math.max(0, targetPos - charLimit / 2);
    const endPos = Math.min(totalChars, targetPos + charLimit / 2);

    // Extract section and clean it up
    let section = content.substring(startPos, endPos);

    // Try to align with paragraph boundaries
    const paragraphs = section.split(/\n\s*\n/);
    if (paragraphs.length > 1) {
      // Find the paragraph closest to the center
      const centerIdx = Math.floor(paragraphs.length / 2);
      const before = paragraphs.slice(0, centerIdx).join('\n\n');
      const after = paragraphs.slice(centerIdx).join('\n\n');

      // Recombine keeping context
      section = before + '\n\n' + after;
    }

    return section.trim();
  }

  /**
   * Generate strategic quiz insertion points based on content
   */
  generateQuizInsertionPoints(content: string): number[] {
    const points = [];
    const paragraphs = content.split(/\n\s*\n/).length;

    // Insert quiz at 30%, 60%, and 90% through content
    points.push(30, 60, 90);

    return points;
  }

  /**
   * Generate strategic image insertion points
   */
  generateImageInsertionPoints(content: string): number[] {
    const points = [];
    const paragraphs = content.split(/\n\s*\n/).length;

    // Insert images at 25%, 50%, and 75% through content
    points.push(25, 50, 75);

    return points;
  }

  private isHeading(text: string): boolean {
    // All caps heading or starts with number
    return /^[A-Z\s\d.]+$/.test(text) && text.length < 100 ||
           /^\d+(\.\d+)*\s+[A-Z]/.test(text);
  }

  private getHeadingLevel(text: string): number {
    if (/^Chapter\s+\d+/i.test(text)) return 1;
    if (/^\d+\.\d+/.test(text)) return 2;
    if (/^\d+\s+[A-Z]/.test(text)) return 2;
    return 3;
  }

  private isListItem(text: string): boolean {
    return /^[-*•]\s+/.test(text) || /^\d+[.)]\s+/.test(text);
  }

  private getListType(text: string): 'ul' | 'ol' {
    return /^\d+[.)]\s+/.test(text) ? 'ol' : 'ul';
  }

  private wrapLists(html: string): string {
    // Wrap consecutive <li> elements into <ul> or <ol>
    return html.replace(/(<li.*?<\/li>\s*)+/gs, (match) => {
      const listType = match.includes('<ol') ? 'ol' : 'ul';
      return `<${listType} class="list-${listType === 'ul' ? 'disc' : 'decimal'} ml-6 mb-4">\n${match}\n</${listType}>`;
    });
  }

  private escapeHtml(text: string): string {
    const map: { [key: string]: string } = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, (m) => map[m]);
  }
}

export const contentFormatter = new ContentFormatter();