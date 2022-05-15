# Websocket server 
#### Simplified websocket server implementation in TypeScript

<img 
  width="620px" 
  src="https://user-images.githubusercontent.com/43048524/168474871-c24d0ead-dac3-4e31-aa78-3d9b9e90f8b6.jpg"
  alt="hide-pain-harold-computer" 
/>

## Painful process
Websocket protocol was harder to implement than I initially thought. I learned a lot about networking and dealing with bitwise operations. Although it is not perfect, it can handle larger files (like images and videos).

### Two main challenges
Handling large WS frames is hard because we have to deal with frame fragmentation over TCP data stream. Second major challenge is parsing WS frame.

### Good resources to learn how Websocket works
1. Wikipedia: https://en.wikipedia.org/wiki/WebSocket
2. WebSockets Crash Course - Handshake, Use-cases, Pros & Cons and more: https://youtu.be/2Nt-ZrNP22A
3. WebSocket Tutorial - How WebSockets Work: https://youtu.be/pNxK8fPKstc
4. WebSocket RFC: https://www.rfc-editor.org/rfc/rfc6455
