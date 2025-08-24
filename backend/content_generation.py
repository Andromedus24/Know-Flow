import logging
import os
from datetime import datetime, timedelta
from typing import Dict, Any, Optional, List
import asyncio
import json

from agno.agent import Agent
from agno.models.anthropic import Claude
from agno.models.openai import OpenAIChat
from agno.team.team import Team
from agno.tools.googlesearch import GoogleSearchTools
from agno.utils.pprint import pprint_run_response

from data.utils import (
    get_knowledge_graph,
    get_lesson_plan,
    parse_json,
    write_knowledge_graph,
    write_lesson_plan,
    fetch_user_id,
)
from data.model import KnowledgeGraph, LessonPlan

from dotenv import load_dotenv

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Load environment variables
load_dotenv()

# Verify required environment variables
required_env_vars = ['OPENAI_API_KEY', 'ANTHROPIC_API_KEY']
missing_vars = [key for key in required_env_vars if not os.getenv(key)]
if missing_vars:
    logger.warning(f"Missing environment variables: {missing_vars}")

# Enhanced Content Generator Agent
content_generator_agent = Agent(
    name="Content Generator",
    role="Creates and refines learning materials and answers user questions",
    instructions=[
        "Parse the instruction for the user_id, source_prompt, and refined_instruction",
        "Begin by generating a comprehensive learning plan based on the users knowledge history and learning pace",
        "Ask the researcher to provide additional external resources",
        "Utilize the provided resources to be included in the following output",
        """Your output must adhere to the following JSON Structure:\n
        {'user_id': 'str',\n
        'plan_id': 'str', \n 
        'plan_title': 'title of new plan', \n
        'description': 'description of plan', \n
        'created_at': 'datetime', \n 
        'last_accessed': 'datetime', \n 
        'status': 'active or archived: default to active', \n 
        'source_prompt': 'prompt from the initial query', \n
        'lessons': [{'lesson_id':str, 'title':'str', 'objectives':['str'], 'content': 'str', 'external_resources':['str'], 'order': 'int'}]""",
        "Ensure that the JSON output contains a list of lessons with objectives in mind. This is the main priority.",
        "Hand off the information to Data Inputter to write to the database",
        "Consider the user's learning style and adapt content accordingly",
        "Include interactive elements and practical exercises in each lesson",
        "Ensure content is engaging and follows modern pedagogical principles"
    ],
    description="You generate comprehensive syllabi (lesson plans) from vague prompts with enhanced user experience",
    structured_outputs=True,
    add_datetime_to_instructions=True,
)

# Enhanced Research Agent
research_agent = Agent(
    name="Researcher",
    role="Find relevant content and information for a given topic",
    instructions=[
        "Search the web for relevant content for a given topic",
        "Only include the most relevant results, between 2-3 links per lesson",
        "Verify that the sources are reliable and educational",
        "Prioritize recent and authoritative sources",
        "Include diverse perspectives when appropriate",
        "Validate information accuracy and relevance",
        "Consider different learning levels (beginner, intermediate, advanced)"
    ],
    tools=[GoogleSearchTools()],
)

# Enhanced Content Writer Agent
content_writer_agent = Agent(
    name="Data Writer",
    role="Input data into the database",
    instructions=[
        """Ensure that the provided message follows this structure:\n
        {'user_id': 'str',\n
        'plan_id': 'str', \n 
        'plan_title': 'title of new plan', \n
        'description': 'description of plan', \n
        'created_at': 'datetime', \n 
        'last_accessed': 'datetime', \n 
        'status': 'active or archived: default to active', \n 
        'source_prompt': 'prompt from the initial query', \n
        'lessons': [{'lesson_id':str, 'title':'str', 'objectives':['str'], 'content': 'str', 'external_resources':['str'], 'order': 'int'}]""",
        "Use the write_lesson_plan tool to add this information to the database",
        "If the user does not have an ID, use fetch_user_id",
        "Validate the data structure before writing to the database",
        "Ensure all required fields are present and properly formatted",
        "Handle database errors gracefully and provide meaningful feedback"
    ],
    tools=[write_lesson_plan, fetch_user_id],
)

# Enhanced Content Generation Team
content_generation_agent = Team(
    name="Content Generator Leader",
    mode="coordinate",
    members=[content_generator_agent, research_agent, content_writer_agent],
    model=OpenAIChat(),
    instructions=[
        """Ensure that the following information is included in the task description: \n
        source_prompt: 'original user prompt'\n
        user_id: 'user_id'\n
        refined instruction: 'your instruction'""",
        "Begin by generating a comprehensive learning plan based on the users knowledge history and learning pace",
        "Delegate tasks to the content generator and data writer to format and append the data to memory",
        "Ensure that the data is formatted to JSON when provided to the data writer",
        "Ensure the data is inputted to the database using get_lesson_plan with user_id and plan_id",
        "If the data is not returned, then ask the inputter to try again",
        "Return the plan_id alongside the generated plan message",
        "Handle errors gracefully and provide meaningful feedback",
        "Ensure content quality and educational value",
        "Optimize for user engagement and learning outcomes"
    ],
    tools=[get_lesson_plan],
    description="You generate comprehensive syllabi (lesson plans) from vague prompts with enhanced quality control",
    add_datetime_to_instructions=True,
    add_member_tools_to_system_message=True,
    enable_agentic_context=True,
    share_members_responses=True,
    show_members_responses=True,
)

# Enhanced Graph Generator Agent
graph_generator_agent = Agent(
    name="Graph Generator",
    model=OpenAIChat(),
    instructions=[
        "Gather the lesson plan information using get_lesson_plan from the user_id and plan_id",
        "Parse the information and understand each lessons content and how they relate to each other",
        """Generate node information in the following JSON Format:\n
        {'concept_id': 'str', \n
        'name': 'concept name', \n
        'description': 'str', \n
        'mastery_level': 'int between 0-100', \n
        'last_reviewed': 'datetime', \n
        'next_review': 'datetime', \n
        'source_lesson_id': 'str',
        'difficulty': 'beginner|intermediate|advanced',
        'estimated_time': 'int in minutes',
        'prerequisites': ['concept_id'],
        'related_concepts': ['concept_id']
        }
        """,
        """Generate edge information in the following JSON format:\n 
        {'edge_id': 'str',
        'source_concept_id': 'str',
        'target_concept_id': 'str'
        'relationship_type': 'related_to, prerequisite_for, or part_of',
        'strength': 'float between 0-1',
        'bidirectional': 'boolean'}
        """,
        "Ensure all concept relationships are logical and educational",
        "Handle errors gracefully and provide meaningful feedback",
        "Create a comprehensive knowledge graph that supports adaptive learning",
        "Consider learning paths and progression sequences"
    ],
    tools=[get_lesson_plan],
    structured_outputs=True,
    use_json_mode=True,
    add_datetime_to_instructions=True,
)

# Enhanced Graph Writer Agent
graph_writer_agent = Agent(
    name="Graph Writer",
    model=OpenAIChat(),
    instructions=[
        "Parse the message for user_id, list of edges, and list of nodes from the graph generator",
        "Using write_knowledge_graph, write the generated user knowledge graph to the database",
        "Validate the data structure before writing",
        "Handle any database errors gracefully",
        "Ensure data integrity and consistency",
        "Optimize graph structure for efficient querying"
    ],
    tools=[write_knowledge_graph],
    add_datetime_to_instructions=True,
)

# Enhanced Knowledge Graph Team
knowledge_graph_agent = Team(
    name="Knowledge Graph Leader",
    model=OpenAIChat(),
    members=[graph_generator_agent, graph_writer_agent],
    instructions=[
        "Determine if the knowledge graph should be updated or generated from scratch by using get_knowledge_graph with the user_id",
        "Delegate tasks to the graph generator to format the data for the graph writer",
        "Then hand the graph writer the content alongside the user_id for appending to memory",
        "Ensure the data is inputted to the database using get_knowledge_graph with user_id",
        "If the data is not returned, then ask the inputter to try again",
        "Return the plan_id alongside the generated plan message",
        "Handle errors gracefully and provide meaningful feedback",
        "Optimize graph structure for learning analytics",
        "Ensure graph scalability and performance"
    ],
    tools=[get_knowledge_graph],
    add_datetime_to_instructions=True,
    add_member_tools_to_system_message=True,
    enable_agentic_context=True,
    share_members_responses=True,
    show_members_responses=True,
)

# Enhanced Learning Orchestrator
leader = Team(
    name="Learning Orchestrator",
    mode="coordinate",
    members=[content_generation_agent, knowledge_graph_agent],
    model=Claude(id="claude-3-7-sonnet-latest"),
    description="You are the central coordinator in charge of determining user intent from input and delegating tasks to other agents with enhanced intelligence",
    instructions=[
        "Given a prompt, determine what the user wants with high accuracy",
        "If the user wants to learn about a new topic, ask the content generator to curate a learning plan",
        """Whenever delegating a task to a member,
        always include the original prompt and the user_id in this format:\n
        source_prompt: 'original user prompt'\n
        user_id: 'user_id'\n
        refined instruction: 'your instruction'""",
        "Then ask the graph agent to generate a knowledge graph of the lesson plan",
        "Handle errors gracefully and provide meaningful feedback to users",
        "Ensure all tasks are completed successfully before proceeding",
        "Optimize for user experience and learning outcomes",
        "Provide progress updates and estimated completion times",
        "Adapt strategies based on user feedback and performance"
    ],
    add_datetime_to_instructions=True,
    add_member_tools_to_system_message=True,
    enable_agentic_context=True,
    share_members_responses=True,
    show_members_responses=True,
)

# New: Learning Analytics Agent
learning_analytics_agent = Agent(
    name="Learning Analytics",
    model=OpenAIChat(),
    instructions=[
        "Analyze user learning patterns and performance data",
        "Generate insights about learning effectiveness and areas for improvement",
        "Recommend personalized learning strategies",
        "Track progress and identify knowledge gaps",
        "Provide actionable feedback for continuous improvement"
    ],
    structured_outputs=True,
    add_datetime_to_instructions=True,
)

# New: Adaptive Learning Agent
adaptive_learning_agent = Agent(
    name="Adaptive Learning",
    model=OpenAIChat(),
    instructions=[
        "Adapt learning content based on user performance and preferences",
        "Adjust difficulty levels dynamically",
        "Personalize learning paths for individual users",
        "Optimize content delivery timing and format",
        "Implement spaced repetition and adaptive testing"
    ],
    structured_outputs=True,
    add_datetime_to_instructions=True,
)

# Enhanced Learning Orchestrator with Analytics
enhanced_leader = Team(
    name="Enhanced Learning Orchestrator",
    mode="coordinate",
    members=[content_generation_agent, knowledge_graph_agent, learning_analytics_agent, adaptive_learning_agent],
    model=Claude(id="claude-3-7-sonnet-latest"),
    description="Advanced learning coordination with analytics and adaptive capabilities",
    instructions=[
        "Coordinate all learning activities with enhanced intelligence",
        "Integrate analytics for continuous improvement",
        "Adapt learning strategies based on real-time data",
        "Ensure optimal learning outcomes for each user",
        "Provide comprehensive learning insights and recommendations"
    ],
    add_datetime_to_instructions=True,
    add_member_tools_to_system_message=True,
    enable_agentic_context=True,
    share_members_responses=True,
    show_members_responses=True,
)

def generate_learning_plan(user_id: str, prompt: str, context: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    """
    Generate a learning plan for a user based on their prompt with enhanced capabilities.
    
    Args:
        user_id: The user's unique identifier
        prompt: The learning prompt or question
        context: Additional context for personalization
        
    Returns:
        Dictionary containing the generated plan and status
    """
    try:
        logger.info(f"Generating enhanced learning plan for user {user_id}: {prompt[:100]}...")
        
        # Prepare enhanced context
        enhanced_prompt = f"user_id={user_id}, prompt={prompt}"
        if context:
            enhanced_prompt += f", context={json.dumps(context)}"
        
        # Run the enhanced leader agent to generate the plan
        start_time = datetime.utcnow()
        
        response = leader.run(
            enhanced_prompt,
            stream=False
        )
        
        processing_time = (datetime.utcnow() - start_time).total_seconds()
        
        logger.info(f"Successfully generated learning plan for user {user_id} in {processing_time:.2f}s")
        
        return {
            "success": True,
            "user_id": user_id,
            "prompt": prompt,
            "response": response,
            "context": context,
            "processing_time": processing_time,
            "timestamp": datetime.utcnow().isoformat(),
            "quality_score": calculate_quality_score(response),
            "estimated_completion_time": estimate_completion_time(response)
        }
        
    except Exception as e:
        logger.error(f"Failed to generate learning plan for user {user_id}: {e}", exc_info=True)
        return {
            "success": False,
            "user_id": user_id,
            "prompt": prompt,
            "error": str(e),
            "error_type": type(e).__name__,
            "timestamp": datetime.utcnow().isoformat(),
            "retry_recommended": should_retry(e)
        }

def calculate_quality_score(response: Any) -> float:
    """
    Calculate a quality score for the generated learning plan.
    
    Args:
        response: The response from the AI agent
        
    Returns:
        Quality score between 0 and 1
    """
    try:
        # Simple quality scoring based on response characteristics
        score = 0.5  # Base score
        
        if hasattr(response, 'content') and response.content:
            content_length = len(str(response.content))
            if content_length > 1000:
                score += 0.2
            if content_length > 2000:
                score += 0.1
                
        if hasattr(response, 'structured_outputs') and response.structured_outputs:
            score += 0.2
            
        return min(score, 1.0)
        
    except Exception as e:
        logger.warning(f"Failed to calculate quality score: {e}")
        return 0.5

def estimate_completion_time(response: Any) -> int:
    """
    Estimate the time to complete the learning plan.
    
    Args:
        response: The response from the AI agent
        
    Returns:
        Estimated completion time in minutes
    """
    try:
        # Simple estimation based on content complexity
        base_time = 30  # Base 30 minutes
        
        if hasattr(response, 'content') and response.content:
            content_length = len(str(response.content))
            if content_length > 2000:
                base_time += 30
            if content_length > 5000:
                base_time += 60
                
        return base_time
        
    except Exception as e:
        logger.warning(f"Failed to estimate completion time: {e}")
        return 30

def should_retry(error: Exception) -> bool:
    """
    Determine if the operation should be retried based on the error.
    
    Args:
        error: The exception that occurred
        
    Returns:
        True if retry is recommended, False otherwise
    """
    # Retry on transient errors
    retryable_errors = [
        'ConnectionError',
        'TimeoutError',
        'RateLimitError',
        'ServiceUnavailableError'
    ]
    
    error_name = type(error).__name__
    return error_name in retryable_errors

async def generate_learning_plan_async(user_id: str, prompt: str, context: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    """
    Asynchronous version of generate_learning_plan for better performance.
    
    Args:
        user_id: The user's unique identifier
        prompt: The learning prompt or question
        context: Additional context for personalization
        
    Returns:
        Dictionary containing the generated plan and status
    """
    try:
        logger.info(f"Starting async learning plan generation for user {user_id}")
        
        # Run the generation in a thread pool to avoid blocking
        loop = asyncio.get_event_loop()
        result = await loop.run_in_executor(
            None, 
            generate_learning_plan, 
            user_id, 
            prompt, 
            context
        )
        
        return result
        
    except Exception as e:
        logger.error(f"Async learning plan generation failed for user {user_id}: {e}")
        return {
            "success": False,
            "user_id": user_id,
            "prompt": prompt,
            "error": str(e),
            "timestamp": datetime.utcnow().isoformat()
        }

def batch_generate_plans(user_prompts: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """
    Generate learning plans for multiple users in batch.
    
    Args:
        user_prompts: List of dictionaries containing user_id and prompt
        
    Returns:
        List of generated plans
    """
    results = []
    
    for user_prompt in user_prompts:
        try:
            result = generate_learning_plan(
                user_prompt['user_id'],
                user_prompt['prompt'],
                user_prompt.get('context')
            )
            results.append(result)
        except Exception as e:
            logger.error(f"Batch generation failed for user {user_prompt.get('user_id')}: {e}")
            results.append({
                "success": False,
                "user_id": user_prompt.get('user_id'),
                "prompt": user_prompt.get('prompt'),
                "error": str(e),
                "timestamp": datetime.utcnow().isoformat()
            })
    
    return results

if __name__ == "__main__":
    # Test the enhanced system
    try:
        logger.info("Testing enhanced Know-Flow content generation system...")
        
        # Test with a sample prompt
        test_user_id = "test_user_001"
        test_prompt = "I want to learn about machine learning fundamentals with practical applications"
        test_context = {
            "learning_style": "visual",
            "difficulty": "beginner",
            "time_availability": 45,
            "prior_knowledge": ["basic programming", "high school math"]
        }
        
        result = generate_learning_plan(test_user_id, test_prompt, test_context)
        
        if result["success"]:
            logger.info("Enhanced test completed successfully!")
            logger.info(f"Generated plan for: {result['prompt']}")
            logger.info(f"Quality score: {result.get('quality_score', 'N/A')}")
            logger.info(f"Estimated completion time: {result.get('estimated_completion_time', 'N/A')} minutes")
        else:
            logger.error(f"Enhanced test failed: {result['error']}")
            
    except Exception as e:
        logger.error(f"Enhanced test execution failed: {e}")
