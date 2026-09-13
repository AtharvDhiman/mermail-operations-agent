import asyncio
import os
import json
import edge_tts

SCENES = [
    {
        "id": "scene01_intro",
        "title": "Introduction & Live Deployment",
        "text": "This is the Mermail Operations Agent, live in production. Mermail provides our autonomous agent with an operational communication layer, while our Agent Skill turns incoming decentralized messages into secure, multi-step operations."
    },
    {
        "id": "scene02_problem",
        "title": "The Problem vs Autonomous Workflow",
        "text": "Traditional email automation is rigid and brittle—blindly triggering actions from simple keywords. Mermail Operations Agent treats inbound communications as untrusted events, orchestrating end-to-end operational workflows with formal safety controls."
    },
    {
        "id": "scene03_mermail",
        "title": "Mermail Communication Layer",
        "text": "Mermail gives the agent a dedicated mailbox identity. The Agent Skill continuously ingests incoming messages, checks thread context, and monitors on-chain relayer gas reserves via native RPC."
    },
    {
        "id": "scene04_modes",
        "title": "Four Specialized Agent Modes",
        "text": "The same underlying architecture powers four specialized operational modes: Automated Meeting Scheduling with calendar constraints, Sales Lead Qualification with ICP scoring, Customer Support ticket triage, and our primary Relayer Sentinel mode for automated Web3 gas monitoring."
    },
    {
        "id": "scene05_scenario",
        "title": "Executing Autonomous Scenario",
        "text": "Let's trigger an autonomous operations scenario. The agent ingests an urgent alert reporting a Solana relayer balance deficit. It classifies the message as a Priority Zero operational incident and autonomously builds a four-step execution DAG."
    },
    {
        "id": "scene06_dag",
        "title": "DAG Planning & Execution Flow",
        "text": "Instead of allowing an LLM to directly execute actions, the skill separates planning, policy validation, execution, and verification into discrete, idempotent steps."
    },
    {
        "id": "scene07_security",
        "title": "Security Shield & Safety Invariants",
        "text": "Every message is scanned for adversarial prompt injection. Unallowlisted addresses are rejected, and disbursements are bound by a rolling daily budget cap and an instant emergency circuit breaker."
    },
    {
        "id": "scene08_approval",
        "title": "Human-in-the-Loop Dual-Control Gate",
        "text": "Here is the core safety invariant: human dual-control. Before any financial disbursement or external email is dispatched, execution halts at an approval gate. The operator reviews the 128-bit cryptographic token and approves the transfer."
    },
    {
        "id": "scene09_settlement",
        "title": "PayBox Settlement & Verification",
        "text": "Upon operator authorization, the agent resumes execution, settles the transfer through the PayBox gateway, verifies the transaction receipt, and completes the workflow."
    },
    {
        "id": "scene10_audit",
        "title": "Append-Only Audit Trail",
        "text": "Every single decision, state transition, and operator intervention is recorded in an append-only audit trail, ensuring complete operational transparency."
    },
    {
        "id": "scene11_skillmd",
        "title": "Standardized SKILL.md Deliverable",
        "text": "The core deliverable is a standardized, reusable Mermail Agent Skill defined in SKILL.md—compatible with any agent framework that supports Mermail."
    },
    {
        "id": "scene12_tests",
        "title": "Production Quality & 107 Automated Tests",
        "text": "Reliability is verified by an automated test suite: 107 unit and security regression tests passing across 42 suites with a 100 percent pass rate."
    },
    {
        "id": "scene13_conclusion",
        "title": "Conclusion & Architecture Summary",
        "text": "Mermail provides the communication layer. Our Agent Skill turns that communication into secure, auditable, multi-step autonomous operations. Mermail Operations Agent—built for Superteam Earn."
    }
]

VOICE = "en-US-AndrewNeural"
OUTPUT_DIR = "video/audio"

async def generate_all():
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    manifest = []

    print(f"Generating voiceovers using {VOICE}...")
    for scene in SCENES:
        out_path = os.path.join(OUTPUT_DIR, f"{scene['id']}.mp3")
        communicate = edge_tts.Communicate(scene['text'], VOICE, rate="+3%", pitch="+0Hz")
        await communicate.save(out_path)
        print(f"Generated {out_path}")

        manifest.append({
            "id": scene['id'],
            "title": scene['title'],
            "text": scene['text'],
            "audioFile": out_path
        })

    with open("video/scenes.json", "w", encoding="utf-8") as f:
        json.dump(manifest, f, indent=2)
    print("Voiceover generation complete! Saved manifest to video/scenes.json")

if __name__ == "__main__":
    asyncio.run(generate_all())
