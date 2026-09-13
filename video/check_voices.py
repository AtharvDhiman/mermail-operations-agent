import asyncio
import edge_tts

async def main():
    voices = await edge_tts.list_voices()
    us_voices = [v['ShortName'] for v in voices if 'en-US' in v['ShortName']]
    print("US Voices:", us_voices[:8])

if __name__ == "__main__":
    asyncio.run(main())
