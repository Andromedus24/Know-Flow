import logging
import os
from datetime import datetime
from typing import Dict, Any, Optional

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
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Load environment variables
load_dotenv()

# Verify required environment variables
required_env_vars = ['OPENAI_API_KEY', 'ANTHROPIC_API_KEY']
missing_vars = [key for key in required_env_vars if not os.getenv(key)]
if missing_vars:
    logger.warning(f"Missing environment variables: {missing_vars}")

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
    ],
    description="You generate comprehensive syllabi (lesson plans) from vague prompts",
    structured_outputs=True,
    add_datetime_to_instructions=True,
)

research_agent = Agent(
    name="Researcher",
    role="Find relevant content and information for a given topic",
    instructions=[
        "Search the web for relevant content for a given topic",
        "Only include the most relevant results, between 2-3 links per lesson",
        "Verify that the sources are reliable and educational",
    ],
    tools=[GoogleSearchTools()],
)

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
    ],
    tools=[write_lesson_plan, fetch_user_id],
)

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
    ],
    tools=[get_lesson_plan],
    description="You generate comprehensive syllabi (lesson plans) from vague prompts",
    add_datetime_to_instructions=True,
    add_member_tools_to_system_message=True,
    enable_agentic_context=True,
    share_member_interactions=True,
    show_members_responses=True,
)


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
        'source_lesson_id': 'str'
        }
        """,
        """Generate edge information in the following JSON format:\n 
        {'edge_id': 'str',
        'source_concept_id': 'str',
        'target_concept_id': 'str'
        'relationship_type': 'related_to, prerequisite_for, or part_of'}
        """,
        "Ensure all concept relationships are logical and educational",
        "Handle errors gracefully and provide meaningful feedback",
    ],
    tools=[get_lesson_plan],
    structured_outputs=True,
    use_json_mode=True,
    add_datetime_to_instructions=True,
)

graph_writer_agent = Agent(
    name="Graph Writer",
    model=OpenAIChat(),
    instructions=[
        "Parse the message for user_id, list of edges, and list of nodes from the graph generator",
        "Using write_knowledge_graph, write the generated user knowledge graph to the database",
        "Validate the data structure before writing",
        "Handle any database errors gracefully",
    ],
    tools=[write_knowledge_graph],
    add_datetime_to_instructions=True,
)

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
    ],
    tools=[get_knowledge_graph],
    add_datetime_to_instructions=True,
    add_member_tools_to_system_message=True,
    enable_agentic_context=True,
    share_member_interactions=True,
    show_members_responses=True,
)

leader = Team(
    name="Learning Orchestrator",
    mode="coordinate",
    members=[content_generation_agent, knowledge_graph_agent],
    model=Claude(id="claude-3-7-sonnet-latest"),
    description="You are the central coordinator in charge of determining user intent from input and delegating tasks to other agents",
    instructions=[
        "Given a prompt, determine what the user wants",
        "If the user wants to learn about a new topic, ask the content generator to curate a learning plan",
        """Whenever delegating a task to a member,
        always include the original prompt and the user_id in this format:\n
        source_prompt: 'original user prompt'\n
        user_id: 'user_id'\n
        refined instruction: 'your instruction'""",
        "Then ask the graph agent to generate a knowledge graph of the lesson plan",
        "Handle errors gracefully and provide meaningful feedback to users",
        "Ensure all tasks are completed successfully before proceeding",
    ],
    add_datetime_to_instructions=True,
    add_member_tools_to_system_message=True,
    enable_agentic_context=True,
    share_member_interactions=True,
    show_members_responses=True,
)

def generate_learning_plan(user_id: str, prompt: str) -> Dict[str, Any]:
    """
    Generate a learning plan for a user based on their prompt.
    
    Args:
        user_id: The user's unique identifier
        prompt: The learning prompt or question
        
    Returns:
        Dictionary containing the generated plan and status
    """
    try:
        logger.info(f"Generating learning plan for user {user_id}: {prompt}")
        
        # Run the leader agent to generate the plan
        response = leader.run(
            f"user_id={user_id}, prompt={prompt}",
            stream=False
        )
        
        logger.info(f"Successfully generated learning plan for user {user_id}")
        return {
            "success": True,
            "user_id": user_id,
            "prompt": prompt,
            "response": response,
            "timestamp": datetime.utcnow().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Failed to generate learning plan for user {user_id}: {e}")
        return {
            "success": False,
            "user_id": user_id,
            "prompt": prompt,
            "error": str(e),
            "timestamp": datetime.utcnow().isoformat()
        }

if __name__ == "__main__":
    # Test the system
    try:
        logger.info("Testing Know-Flow content generation system...")
        
        # Test with a sample prompt
        test_user_id = "test_user_001"
        test_prompt = "I want to learn about machine learning fundamentals"
        
        result = generate_learning_plan(test_user_id, test_prompt)
        
        if result["success"]:
            logger.info("Test completed successfully!")
            logger.info(f"Generated plan for: {result['prompt']}")
        else:
            logger.error(f"Test failed: {result['error']}")
            
    except Exception as e:
        logger.error(f"Test execution failed: {e}")
