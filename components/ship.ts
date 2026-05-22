import { FlightComputerModule } from "@/types";
import { drawRegularShip, drawMultiStageRocket, drawStation, drawSatellite } from "./ship/designs";

/**
 * Pure Canvas rendering function for Ships.
 * Call this inside your game loop's render method.
 * 
 * Acts as a dispatcher based on the ship's design configuration.
 */
export function drawShip(
    ctx: CanvasRenderingContext2D,
    centerX: number,
    centerY: number,
    angle: number,
    thrust: { x: number, y: number },
    scale: number,
    body: any,
    flightComputerModules: FlightComputerModule[],
) {
    const time = performance.now() / 20; // Global animation timer
    const size = scale;

    ctx.save();
    ctx.translate(centerX, centerY + (size * 0.2));
    ctx.rotate(angle);

    const design = body.shipStructure?.design || 'rocket';

    switch (design) {
        case 'multistage':
            drawMultiStageRocket(ctx, size, time, body, flightComputerModules, thrust);
            break;
        case 'station':
            drawStation(ctx, size, time, body, flightComputerModules, thrust);
            break;
        case 'satellite':
            drawSatellite(ctx, size, time, body, flightComputerModules, thrust);
            break;
        case 'rocket':
        default:
            drawRegularShip(ctx, size, time, body, flightComputerModules, thrust);
            break;
    }

    ctx.restore();
}
