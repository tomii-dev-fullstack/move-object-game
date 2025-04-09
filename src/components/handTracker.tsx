import { useEffect, useRef, useState } from 'react';
import { Hands, ResultsListener } from '@mediapipe/hands';
import { Camera } from '@mediapipe/camera_utils';
import { FallingObject } from '../types/falling';
import Score from './score';


export default function HandTracker() {
    const videoRef = useRef<HTMLVideoElement | null>(null);
    const boxRef = useRef<HTMLDivElement | null>(null);
    const [lastPosition, setLastPosition] = useState({ x: 0, y: 0 });
    const [score, setScore] = useState(0);

    // Usamos un "ref" para la generación de objetos, así no estamos actualizando el estado
    const fallingObjectsRef = useRef<FallingObject[]>([]);

    useEffect(() => {
        const hands = new Hands({
            locateFile: (file: string) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`,
        });

        hands.setOptions({
            maxNumHands: 1,
            modelComplexity: 1,
            minDetectionConfidence: 0.8,
            minTrackingConfidence: 0.8,
        });

        const onResults: ResultsListener = (results) => {
            if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
                const wrist = results.multiHandLandmarks[0][0]; // Coordenadas de la muñeca

                // Calculamos la posición del cuadrado en función de las coordenadas de la muñeca
                const x = wrist.x * window.innerWidth; // Coordenada X de la muñeca
                const y = wrist.y * window.innerHeight; // Coordenada Y de la muñeca

                // Invertimos el eje X para que coincida con el movimiento de la mano
                const reversedX = window.innerWidth - x;

                // Actualizamos la posición de la mano en el estado
                setLastPosition({ x: reversedX, y });

                // Mover el cuadrado con las coordenadas ajustadas
                if (boxRef.current) {
                    boxRef.current.style.left = `${reversedX}px`;
                    boxRef.current.style.top = `${y}px`;
                }
            }
        };

        hands.onResults(onResults);

        if (videoRef.current) {
            const camera = new Camera(videoRef.current, {
                onFrame: async () => {
                    if (videoRef.current) {
                        await hands.send({ image: videoRef.current });
                    }
                },
                width: 640,
                height: 480,
            });

            camera.start();
        }

        // Generación de objetos de manera eficiente
        const generateFallingObject = () => {
            if (fallingObjectsRef.current.length < 2) {
                const object: FallingObject = {
                    id: Date.now(),
                    x: Math.random() * window.innerWidth,
                    y: -50,
                    size: 30 + Math.random() * 50,
                    speed: 0.5,
                };
                fallingObjectsRef.current.push(object);
            }
        };

        // Animación de los objetos (caída y detección de colisiones)
        const update = () => {
            // Mover objetos
            fallingObjectsRef.current = fallingObjectsRef.current
                .map((object) => ({
                    ...object,
                    y: object.y + object.speed,
                }))
                .filter((object) => object.y < window.innerHeight); // Eliminar objetos fuera de la pantalla

            // Detectar colisiones
            let newScore = score;
            fallingObjectsRef.current = fallingObjectsRef.current.filter((object) => {
                const distanceX = Math.abs(object.x - lastPosition.x);
                const distanceY = Math.abs(object.y - lastPosition.y);
                if (distanceX < object.size / 2 + 50 && distanceY < object.size / 2 + 50) {
                    newScore += 5; // Incrementar el puntaje
                    return false; // Eliminar el objeto "comido"
                }
                return true;
            });

            // Actualizar puntaje si hay cambios
            if (newScore !== score) {
                setScore(newScore);
            }

            // Continuar con el ciclo de animación
            requestAnimationFrame(update);
        };

        // Iniciar animación
        requestAnimationFrame(update);

        // Generar objetos a intervalos regulares, pero con menos frecuencia
        const objectGenerationInterval = setInterval(generateFallingObject, 1000); // Cada 1 segundo

        return () => {
            clearInterval(objectGenerationInterval);
        };
    }, [lastPosition, score]); // Solo vuelve a ejecutarse cuando cambian lastPosition o score

    return (
        <>
            <video
                ref={videoRef}
                style={{ display: 'none' }}
                autoPlay
                playsInline
            />
            {fallingObjectsRef.current.map((object) => (
                <div
                    key={object.id}
                    style={{
                        position: 'absolute',
                        top: `${object.y}px`,
                        left: `${object.x}px`,
                        width: `${object.size}px`,
                        height: `${object.size}px`,
                        backgroundColor: 'blue',
                        borderRadius: '50%',
                    }}
                />
            ))}
            <div
                ref={boxRef}
                style={{
                    position: 'absolute',
                    left: `${lastPosition.x}px`,
                    top: `${lastPosition.y}px`,
                    width: '100px',
                    height: '100px',
                    backgroundColor: 'red',
                    borderRadius: '12px',
                    transform: 'translate(-50%, -50%)',
                    transition: 'left 0.1s linear, top 0.1s linear',
                }}
            />
            <div
                style={{
                    position: 'absolute',
                    top: '20px',
                    right: '20px',
                    fontSize: '24px',
                    fontWeight: 'bold',
                    color: 'white',
                }}
            >
                <Score score={score} />
            </div>
        </>
    );
}
