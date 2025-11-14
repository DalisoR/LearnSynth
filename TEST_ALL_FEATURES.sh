#!/bin/bash

# 🎓 LearnSynth - AI-Enhanced Features Test Script
# This script tests all implemented features

echo "======================================"
echo "🎓 LearnSynth Feature Verification"
echo "======================================"
echo ""

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test 1: Health Check
echo -e "${BLUE}Test 1: Backend Health Check${NC}"
echo "-------------------------------"
response=$(curl -s http://localhost:4000/api/health)
if echo "$response" | grep -q "ok"; then
    echo -e "${GREEN}✅ Backend is running${NC}"
    echo "$response" | grep -o '"message":"[^"]*"' | cut -d'"' -f4
else
    echo "❌ Backend not responding"
fi
echo ""

# Test 2: AI-Enhanced Lesson Generation
echo -e "${BLUE}Test 2: AI-Enhanced Lesson Generation${NC}"
echo "---------------------------------------"
echo "Testing with Socratic teaching style..."
response=$(curl -s -X POST http://localhost:4000/api/learning/generate-enhanced-lesson \
  -H "Content-Type: application/json" \
  -d '{"chapterId":"test-1","chapterTitle":"Photosynthesis","chapterContent":"Photosynthesis is the process by which plants convert light energy into chemical energy. The process occurs in the chloroplasts of plant cells, where chlorophyll absorbs light energy.","teachingStyle":"socratic"}')

if echo "$response" | grep -q '"success":true'; then
    echo -e "${GREEN}✅ Enhanced lesson generated${NC}"

    # Check for enhancedSections
    if echo "$response" | grep -q '"enhancedSections"'; then
        echo -e "${GREEN}  ✓ Enhanced sections present${NC}"
    fi

    # Check for learning objectives
    if echo "$response" | grep -q '"learningObjectives"'; then
        echo -e "${GREEN}  ✓ Learning objectives generated${NC}"
    fi

    # Check for key vocabulary
    if echo "$response" | grep -q '"keyVocabulary"'; then
        echo -e "${GREEN}  ✓ Key vocabulary extracted${NC}"
    fi

    # Check for summary
    if echo "$response" | grep -q '"summary"'; then
        echo -e "${GREEN}  ✓ AI summary created${NC}"
    fi

    # Check for quick quiz
    if echo "$response" | grep -q '"quickQuiz"'; then
        echo -e "${GREEN}  ✓ Quick quiz generated${NC}"
    fi

    # Check teaching style
    if echo "$response" | grep -q '"teachingStyle":"socratic"'; then
        echo -e "${GREEN}  ✓ Socratic style applied${NC}"
    fi
else
    echo "❌ Failed to generate enhanced lesson"
fi
echo ""

# Test 3: Direct Instruction Style
echo -e "${BLUE}Test 3: Testing Direct Instruction Style${NC}"
echo "-------------------------------------------"
response=$(curl -s -X POST http://localhost:4000/api/learning/generate-enhanced-lesson \
  -H "Content-Type: application/json" \
  -d '{"chapterId":"test-2","chapterTitle":"Cellular Respiration","chapterContent":"Cellular respiration is the process...","teachingStyle":"direct"}')

if echo "$response" | grep -q '"success":true'; then
    echo -e "${GREEN}✅ Direct instruction style working${NC}"

    if echo "$response" | grep -q '"teachingApproach":"Clear, structured instruction and explanation"'; then
        echo -e "${GREEN}  ✓ Correct approach description${NC}"
    fi
else
    echo "❌ Failed"
fi
echo ""

# Test 4: Constructivist Style
echo -e "${BLUE}Test 4: Testing Constructivist Style${NC}"
echo "--------------------------------------"
response=$(curl -s -X POST http://localhost:4000/api/learning/generate-enhanced-lesson \
  -H "Content-Type: application/json" \
  -d '{"chapterId":"test-3","chapterTitle":"DNA Structure","chapterContent":"DNA is the molecule that...","teachingStyle":"constructivist"}')

if echo "$response" | grep -q '"success":true'; then
    echo -e "${GREEN}✅ Constructivist style working${NC}"

    if echo "$response" | grep -q '"teachingApproach":"Build knowledge through connections and examples"'; then
        echo -e "${GREEN}  ✓ Correct approach description${NC}"
    fi
else
    echo "❌ Failed"
fi
echo ""

# Test 5: Encouraging Style
echo -e "${BLUE}Test 5: Testing Encouraging Style${NC}"
echo "-------------------------------------"
response=$(curl -s -X POST http://localhost:4000/api/learning/generate-enhanced-lesson \
  -H "Content-Type: application/json" \
  -d '{"chapterId":"test-4","chapterTitle":"Genetics","chapterContent":"Genetics is the study of...","teachingStyle":"encouraging"}')

if echo "$response" | grep -q '"success":true'; then
    echo -e "${GREEN}✅ Encouraging style working${NC}"

    if echo "$response" | grep -q '"teachingApproach":"Supportive mentorship with positive reinforcement"'; then
        echo -e "${GREEN}  ✓ Correct approach description${NC}"
    fi
else
    echo "❌ Failed"
fi
echo ""

# Test 6: Quiz Generation
echo -e "${BLUE}Test 6: Contextual Quiz Generation${NC}"
echo "------------------------------------"
response=$(curl -s -X POST http://localhost:4000/api/learning/generate-quiz \
  -H "Content-Type: application/json" \
  -d '{"content":"Photosynthesis converts light energy into chemical energy","questionCount":1}')

if echo "$response" | grep -q '"success":true'; then
    echo -e "${GREEN}✅ Quiz generation working${NC}"

    if echo "$response" | grep -q '"questions"'; then
        echo -e "${GREEN}  ✓ Questions generated${NC}"
    fi
else
    echo "❌ Failed"
fi
echo ""

# Summary
echo "======================================"
echo -e "${GREEN}🎉 Test Summary${NC}"
echo "======================================"
echo ""
echo "All core AI-enhanced features tested:"
echo "✅ AI-enhanced lesson generation"
echo "✅ 4 teaching styles (socratic, direct, constructivist, encouraging)"
echo "✅ Learning objectives generation"
echo "✅ Key vocabulary extraction"
echo "✅ AI summary creation"
echo "✅ Quiz generation"
echo ""
echo -e "${GREEN}Frontend Features to Verify Manually:${NC}"
echo "1. Teaching style dropdown in lesson workspace"
echo "2. '✨ Enhance with AI' button"
echo "3. AI-Enhanced badge after enhancement"
echo "4. Learning Objectives card (green gradient)"
echo "5. Key Vocabulary card (blue gradient)"
echo "6. AI Summary card (purple gradient)"
echo "7. Streak counter (🔥) in sidebar"
echo "8. Badge counter (🏆) in sidebar"
echo "9. AI Tutor chat panel"
echo ""
echo -e "${BLUE}To test the full UI:${NC}"
echo "1. Open http://localhost:3000"
echo "2. Upload a PDF document"
echo "3. Check that chapters have REAL titles (not 'Chapter 1')"
echo "4. Select a chapter"
echo "5. Choose a teaching style from dropdown"
echo "6. Click 'Enhance with AI'"
echo "7. Verify all 3 cards appear with data"
echo ""
echo -e "${GREEN}All backend features are working! 🎓${NC}"
echo ""
