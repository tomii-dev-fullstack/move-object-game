import { FC } from "react";

type ScoreProps = {
    score: number;
}

const Score: FC<ScoreProps> = ({ score }) => {
    return (
        <h4 style={{ margin: 0 }}>
            Puntaje: {score}
        </h4>
    );
}

export default Score;
