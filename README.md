 >***Built for HowdyHack 2025***

# Inspiration

While brainstorming for a new idea, we found ourselves constantly having to jot things down. Additionally, we were creating all sorts of diagrams that could follow our thought process as we rapid-fired various ideas. We realized that we could create a tool to do this for us in real time, leaving us free to ideate.
What it does

DreamTalk brings life to conversations by generating a flow chart of ideas to organize and review the user's thoughts. This is accomplished by managing and updating a complex tree of nodes based on key topics throughout a conversation. Additionally, it compiles the discussion about said topics while simultaneously connecting new concepts to past ideas.
How we built it

# How we built it

We built it with a React frontend written in typescript, connected to a Flask backend written in Python. We also implemented MongoDB as a database to manage the tree and user conversation. We built robust RESTful API's to connect our frontend and backend, and implemented AI integration through OpenAI Whisper and Claude Sonnet 4.5.
Challenges we ran into

# Challenges we ran into

- Figuring out how to manage the use of multiple languages
- Correctly updating the database, and calling from it
- Creating an efficient flow for the data
- Prompting the model to parse for keywords and limit it's own generation.
- Inputting speech and converting to txt file that continuously updates
- Managing front end node diagrams using React Flow

# Accomplishments that we're proud of

We were able to combine various different aspects of computer science and connect them in a way that helps shape the students of the future. We were also able to adjust our application so it doesn't require additional user input to function. This is very important to improving the user experience as this tool can join the conversation with no additional burden on the users.
What we learned

# What we learned

- How to break down complex problems and work flows into smaller manageable chunks that we could then put together to create a full-stack web app.
- The importance of prompt engineering, and how significantly it can impact Generative AI results.
- How to express our ideas in a way our teammates could understand, and build tools that we could expand upon.

# What's next for DreamTalk

DreamTalk will continue to evolve as we add features like accessing previous mind map sessions and more responsive generations. We believe DreamTalk can be used by people in creative spaces just like us, trying to organize our thoughts in a messy world.

# Built With

    claude
    flask
    mongodb
    openai
    postman
    python
    react
    typescript

