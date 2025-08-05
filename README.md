# Medical Assistant Chatbot SDK

A lightweight SDK for integrating medical assistant chatbot functionality into your applications.

## Features

- **Medical Q&A**: Get instant answers to medical questions
- **Symptom Analysis**: Basic symptom assessment and guidance
- **Health Information**: Access to medical knowledge base
- **Easy Integration**: Simple API for quick implementation

## Installation

```bash
npm install @eka/med-assist-sdk
```

## Quick Start

```javascript
import { MedicalAssistant } from '@eka/med-assist-sdk';

const assistant = new MedicalAssistant({
  apiKey: 'your-api-key',
  environment: 'production' // or 'development'
});

// Send a medical question
const response = await assistant.ask('What are the symptoms of diabetes?');
console.log(response.answer);
```

## Basic Usage

### Initialize the SDK

```javascript
const assistant = new MedicalAssistant({
  apiKey: process.env.MED_ASSIST_API_KEY,
  timeout: 30000, // 30 seconds
  maxRetries: 3
});
```

### Ask Medical Questions

```javascript
const response = await assistant.ask('How to treat a headache?');
```

### Get Symptom Analysis

```javascript
const symptoms = ['fever', 'cough', 'fatigue'];
const analysis = await assistant.analyzeSymptoms(symptoms);
```

## Configuration Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `apiKey` | string | required | Your API key |
| `environment` | string | 'production' | SDK environment |
| `timeout` | number | 30000 | Request timeout in ms |
| `maxRetries` | number | 3 | Maximum retry attempts |

## Error Handling

```javascript
try {
  const response = await assistant.ask('Medical question here');
} catch (error) {
  if (error.code === 'RATE_LIMIT') {
    console.log('Rate limit exceeded');
  } else if (error.code === 'INVALID_API_KEY') {
    console.log('Invalid API key');
  }
}
```

## License

MIT License - see LICENSE file for details.

## Support

For support and questions, please contact our team or open an issue in this repository. 