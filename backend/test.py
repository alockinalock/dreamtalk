import anthropic
client = anthropic.Anthropic(api_key="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")

prompt = "What did i ask previously"
response = client.messages.create(
    model="claude-sonnet-4-5",
    max_tokens=10,
    system="You are a helpful assistant.",
    messages=[
        {"role": "user", "content": prompt}
    ]
)
print("Claude response:", response.content[0].text)