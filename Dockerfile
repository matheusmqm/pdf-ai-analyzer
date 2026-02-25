FROM python

WORKDIR /app

#copiar dependencias

COPY pyproject.toml uv.lock ./

#instalar uv
RUN pip install uv

#instalar dependencias
RUN uv sync --frozen

#copiar projeto
COPY . .

#expoe a porta
EXPOSE 8000

#rodar fastapi
CMD ["uv", "run", "uvicorn", "app.app:app", "--host", "0.0.0.0", "--port", "8000"]