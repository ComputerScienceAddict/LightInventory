import React, { useState, useRef } from 'react';
import { 
  Container, 
  Typography, 
  Box, 
  Button, 
  Paper,
  CircularProgress,
  Card,
  CardContent,
  Grid,
  Alert,
  Snackbar
} from '@mui/material';
import { createTheme, ThemeProvider } from '@mui/material/styles';
import { motion } from 'framer-motion';
import { useInView } from 'react-intersection-observer';
import { supabase } from './supabaseClient';

// Temporary icon replacements
const CloudUploadIcon = () => <span>📤</span>;
const EcoIcon = () => <span>🌱</span>;
const RecyclingIcon = () => <span>♻️</span>;
const LocalShippingIcon = () => <span>🚚</span>;

const theme = createTheme({
  palette: {
    primary: {
      main: '#2e7d32',
      light: '#4caf50',
      dark: '#1b5e20',
    },
    secondary: {
      main: '#ff9800',
      light: '#ffb74d',
      dark: '#f57c00',
    },
    background: {
      default: '#f5f5f5',
      paper: '#ffffff',
    },
  },
  typography: {
    fontFamily: '"Poppins", "Roboto", "Helvetica", "Arial", sans-serif',
    h1: {
      fontWeight: 700,
    },
    h2: {
      fontWeight: 600,
    },
  },
  shape: {
    borderRadius: 12,
  },
});

const MotionPaper = motion(Paper);

const GEMINI_API_KEY = 'AIzaSyCvhJ9wB6_o1zIL8VG8emnlqY6WG0LRylo';

const SUSTAINABLE_COMPANIES = [
  {
    name: "EcoEnclose",
    description: "Sustainable packaging solutions",
    link: "https://www.ecoenclose.com",
    category: "Packaging"
  },
  {
    name: "TerraCycle",
    description: "Recycling and upcycling solutions",
    link: "https://www.terracycle.com",
    category: "Recycling"
  },
  {
    name: "GreenBiz",
    description: "Sustainable business resources",
    link: "https://www.greenbiz.com",
    category: "Business"
  },
  {
    name: "Sustainable Brands",
    description: "Sustainable product marketplace",
    link: "https://www.sustainablebrands.com",
    category: "Products"
  }
];

async function analyzeImageWithGemini(imageUrl) {
  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [
            {
              text: "Analyze this image and identify the materials present. Describe their environmental impact and estimate CO2 emissions if possible. Focus on sustainability aspects and suggest alternatives. Format the response in a clear, structured way with sections for: 1) Materials Identified, 2) Environmental Impact, 3) CO2 Emissions Estimate, and 4) Sustainable Alternatives."
            },
            {
              inline_data: {
                mime_type: "image/jpeg",
                data: imageUrl.split(',')[1]
              }
            }
          ]
        }],
        generationConfig: {
          temperature: 0.4,
          topK: 32,
          topP: 1,
          maxOutputTokens: 2048,
        }
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error?.message || 'Failed to analyze image with Gemini');
    }

    const data = await response.json();
    if (!data.candidates?.[0]?.content?.parts?.[0]?.text) {
      throw new Error('Invalid response format from Gemini');
    }
    
    return data.candidates[0].content.parts[0].text;
  } catch (error) {
    console.error('Error analyzing image with Gemini:', error);
    throw error;
  }
}

function App() {
  const [image, setImage] = useState(null);
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState(null);
  const [error, setError] = useState(null);
  const fileInputRef = useRef(null);
  const [ref, inView] = useInView({
    triggerOnce: true,
    threshold: 0.1,
  });

  const handleImageUpload = async (event) => {
    try {
      const file = event.target.files[0];
      if (!file) return;

      setLoading(true);
      setError(null);
      setAnalysis(null);

      // Convert file to base64
      const reader = new FileReader();
      reader.readAsDataURL(file);
      
      reader.onload = async () => {
        const base64Image = reader.result;
        setImage(base64Image);

        try {
          // Analyze with Gemini
          const materialAnalysis = await analyzeImageWithGemini(base64Image);
          setAnalysis(materialAnalysis);

          // Save to Supabase
          const fileName = `${Date.now()}-${file.name}`;
          const { error: uploadError } = await supabase.storage
            .from('materials')
            .upload(`uploads/${fileName}`, file);

          if (uploadError) throw uploadError;

          const { data: { publicUrl } } = supabase.storage
            .from('materials')
            .getPublicUrl(`uploads/${fileName}`);

          const { error: analysisError } = await supabase
            .from('material_analysis')
            .insert([{
              image_url: publicUrl,
              analysis: materialAnalysis,
              processed_at: new Date().toISOString()
            }]);

          if (analysisError) throw analysisError;

          await supabase.storage
            .from('materials')
            .move(`uploads/${fileName}`, `processed/${fileName}`);

        } catch (err) {
          console.error('Error processing image:', err);
          setError(err.message);
        } finally {
          setLoading(false);
        }
      };

      reader.onerror = (error) => {
        console.error('Error reading file:', error);
        setError('Failed to read image file');
        setLoading(false);
      };

    } catch (err) {
      console.error('Error handling upload:', err);
      setError(err.message);
      setLoading(false);
    }
  };

  const generateSuggestions = (analysis) => {
    if (!analysis) return [];
    
    const suggestions = [
      {
        text: 'Consider using recycled or biodegradable materials',
        icon: <EcoIcon />
      },
      {
        text: 'Look for products with minimal packaging',
        icon: <LocalShippingIcon />
      },
      {
        text: 'Choose products with recyclable components',
        icon: <RecyclingIcon />
      }
    ];

    return suggestions;
  };

  return (
    <ThemeProvider theme={theme}>
      <Box sx={{ 
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
        py: 4
      }}>
        <Container maxWidth="lg">
          <MotionPaper
            elevation={3}
            sx={{ p: 4, mb: 4, borderRadius: 4 }}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <Typography 
              variant="h3" 
              component="h1" 
              gutterBottom 
              align="center"
              sx={{ 
                color: theme.palette.primary.main,
                fontWeight: 700,
                mb: 2
              }}
            >
              Light Inventory
            </Typography>
            <Typography 
              variant="h5" 
              component="h2" 
              gutterBottom 
              align="center"
              sx={{ color: theme.palette.text.secondary }}
            >
              Analyze Your Materials' Environmental Impact
            </Typography>
          </MotionPaper>

          <MotionPaper
            elevation={3}
            sx={{ p: 4, mb: 4, borderRadius: 4 }}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
              <input
                ref={fileInputRef}
                accept="image/*"
                style={{ display: 'none' }}
                id="image-upload"
                type="file"
                onChange={handleImageUpload}
                disabled={loading}
              />
              <label htmlFor="image-upload">
                <Button 
                  variant="contained" 
                  component="span"
                  size="large"
                  startIcon={<CloudUploadIcon />}
                  disabled={loading}
                  sx={{ 
                    py: 2,
                    px: 4,
                    borderRadius: 2,
                    textTransform: 'none',
                    fontSize: '1.1rem'
                  }}
                >
                  {loading ? 'Processing...' : 'Upload Image'}
                </Button>
              </label>

              {loading && (
                <Box sx={{ display: 'flex', justifyContent: 'center' }}>
                  <CircularProgress />
                </Box>
              )}

              {image && (
                <Box sx={{ 
                  mt: 2,
                  position: 'relative',
                  overflow: 'hidden',
                  borderRadius: 4,
                  boxShadow: 3
                }}>
                  <img 
                    src={image} 
                    alt="Uploaded" 
                    style={{ 
                      maxWidth: '100%', 
                      maxHeight: '400px',
                      display: 'block'
                    }} 
                  />
                </Box>
              )}
            </Box>
          </MotionPaper>

          {analysis && (
            <MotionPaper
              elevation={3}
              sx={{ p: 4, mb: 4, borderRadius: 4 }}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.4 }}
            >
              <Typography variant="h5" gutterBottom sx={{ 
                color: theme.palette.primary.main,
                fontWeight: 600,
                mb: 3
              }}>
                Material Analysis
              </Typography>
              <Box sx={{ 
                backgroundColor: theme.palette.background.paper,
                p: 3,
                borderRadius: 2,
                boxShadow: 1
              }}>
                {analysis.split('\n').map((paragraph, index) => (
                  <Typography 
                    key={index} 
                    variant="body1" 
                    sx={{ 
                      mb: 2,
                      color: paragraph.startsWith('1)') || 
                            paragraph.startsWith('2)') || 
                            paragraph.startsWith('3)') || 
                            paragraph.startsWith('4)') 
                            ? theme.palette.primary.main 
                            : theme.palette.text.primary,
                      fontWeight: paragraph.startsWith('1)') || 
                                 paragraph.startsWith('2)') || 
                                 paragraph.startsWith('3)') || 
                                 paragraph.startsWith('4)') 
                                 ? 600 
                                 : 400
                    }}
                  >
                    {paragraph}
                  </Typography>
                ))}
              </Box>
            </MotionPaper>
          )}

          {analysis && (
            <MotionPaper
              ref={ref}
              elevation={3}
              sx={{ p: 4, mb: 4, borderRadius: 4 }}
              initial={{ opacity: 0, y: 20 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5, delay: 0.6 }}
            >
              <Typography variant="h5" gutterBottom sx={{ 
                color: theme.palette.primary.main,
                fontWeight: 600,
                mb: 3
              }}>
                Sustainable Alternatives & Resources
              </Typography>
              <Grid container spacing={3}>
                {SUSTAINABLE_COMPANIES.map((company, index) => (
                  <Grid item xs={12} sm={6} md={4} key={index}>
                    <Card sx={{ 
                      height: '100%',
                      transition: 'transform 0.2s',
                      '&:hover': {
                        transform: 'translateY(-4px)',
                        boxShadow: 3
                      }
                    }}>
                      <CardContent>
                        <Typography variant="h6" gutterBottom sx={{ color: theme.palette.primary.main }}>
                          {company.name}
                        </Typography>
                        <Typography variant="body2" color="text.secondary" gutterBottom>
                          {company.category}
                        </Typography>
                        <Typography variant="body1" sx={{ mb: 2 }}>
                          {company.description}
                        </Typography>
                        <Button 
                          variant="contained" 
                          color="primary"
                          href={company.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          sx={{ 
                            textTransform: 'none',
                            borderRadius: 2
                          }}
                        >
                          Visit Website
                        </Button>
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            </MotionPaper>
          )}

          {analysis && (
            <MotionPaper
              elevation={3}
              sx={{ p: 4, borderRadius: 4 }}
              initial={{ opacity: 0, y: 20 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5, delay: 0.8 }}
            >
              <Typography variant="h5" gutterBottom sx={{ 
                color: theme.palette.primary.main,
                fontWeight: 600,
                mb: 3
              }}>
                Quick Tips for Improvement
              </Typography>
              <Grid container spacing={2}>
                {generateSuggestions(analysis).map((suggestion, index) => (
                  <Grid item xs={12} sm={6} md={4} key={index}>
                    <Card sx={{ 
                      height: '100%',
                      backgroundColor: theme.palette.primary.light,
                      color: 'white'
                    }}>
                      <CardContent>
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          {suggestion.icon}
                          <Typography variant="body1" sx={{ ml: 1 }}>
                            {suggestion.text}
                          </Typography>
                        </Box>
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            </MotionPaper>
          )}
        </Container>

        <Snackbar 
          open={!!error} 
          autoHideDuration={6000} 
          onClose={() => setError(null)}
        >
          <Alert severity="error" onClose={() => setError(null)}>
            {error}
          </Alert>
        </Snackbar>
      </Box>
    </ThemeProvider>
  );
}

export default App; 